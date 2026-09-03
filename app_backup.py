from flask import Flask, request, jsonify , Response , send_from_directory
import requests
from flask_cors import CORS
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from dotenv import load_dotenv
import mysql.connector
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from groq import Groq

# =========================================================
# Load Environment Variables
# =========================================================

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/settings")
def settings_page():
    return send_from_directory("Frontend", "settings.html")

@app.route("/settings.js")
def settings_js():
    return send_from_directory("Frontend", "settings.js")
# =========================================================
# MySQL Connection
# =========================================================

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

db = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME
)
cursor = db.cursor(dictionary=True)


# =========================================================
# Twilio Configuration
# =========================================================

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")
BASE_URL = os.getenv("BASE_URL")
print("BASE URL loaded:", bool(BASE_URL))

client = Client(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
)
print("Twilio SID loaded:", bool(TWILIO_ACCOUNT_SID))
print("Twilio Auth Token loaded:", bool(TWILIO_AUTH_TOKEN))
print("Groq Key loaded:", bool(os.getenv("GROQ_API_KEY")))

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# =========================================================
# Home / Health Check
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "status": "success",
        "message": "AI Voice Calling Agent Backend Running"
    })






@app.route("/login", methods=["POST"])
def login():
    try:

        data = request.get_json()

        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400


        cursor.execute("""
            SELECT id, name, email, password
            FROM users
            WHERE email = %s
        """, (email,))

        user = cursor.fetchone()


        if not user:

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401


        if password != user["password"]:

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401


        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        })


    except Exception as e:

        print("Login Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to process login."
        }), 500
# =========================================================
# Make Outbound Call
# =========================================================

@app.route("/make-call", methods=["POST"])
def make_call():

    try:

        data = request.get_json()

        phone_number = data.get("phone_number")

        if not phone_number:

            return jsonify({
                "success": False,
                "message": "Phone number is required"
            }), 400


        # Create Twilio call
        print("Voice URL:", f"{BASE_URL}/voice")
        call = client.calls.create(

            to=phone_number,

            from_=TWILIO_NUMBER,

            url=f"{BASE_URL}/voice",

            status_callback=f"{BASE_URL}/call-status",

            status_callback_event=[
                "initiated",
                "ringing",
                "answered",
                "completed"
            ],

            status_callback_method="POST",

            record=True,

            recording_status_callback=f"{BASE_URL}/recording",

            recording_status_callback_method="POST",

            recording_status_callback_event=["completed"]

        )


        # Save call in database

        ist = ZoneInfo("Asia/Kolkata")

        current_time = datetime.now(ist).strftime(
            "%Y-%m-%d %H:%M:%S"
        )


        cursor.execute(
            """
            INSERT INTO calls
            (
                phone_number,
                call_sid,
                status,
                created_at
            )
            VALUES
            (%s, %s, %s, %s)
            """,
            (
                phone_number,
                call.sid,
                "initiated",
                current_time
            )
        )

        db.commit()


        return jsonify({

            "success": True,

            "message": "Call initiated successfully",

            "call_sid": call.sid

        })


    except Exception as e:

        print("Make Call Error:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500

@app.route("/settings-data", methods=["GET"])
def get_settings_data():
    try:
        cursor.execute("""
            SELECT id, email
            FROM users
            WHERE id = 1
        """)

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        return jsonify({
            "success": True,
            "settings": {
                "email": user["email"]
            }
        })

    except Exception as e:
        print("Get Settings Error:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@app.route("/settings-data", methods=["POST"])
def save_settings_data():
    try:
        data = request.get_json()

        email = data.get("email", "").strip()
        current_password = data.get("currentPassword", "")
        new_password = data.get("newPassword", "")

        if not email:
            return jsonify({
                "success": False,
                "message": "Email / Login ID is required"
            }), 400

        cursor.execute("""
            SELECT id, email, password
            FROM users
            WHERE id = 1
        """)

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        if new_password:

            if not current_password:
                return jsonify({
                    "success": False,
                    "message": "Current password is required"
                }), 400

            if current_password != user["password"]:
                return jsonify({
                    "success": False,
                    "message": "Current password is incorrect"
                }), 400

            if len(new_password) < 6:
                return jsonify({
                    "success": False,
                    "message": "New password must contain at least 6 characters"
                }), 400

            cursor.execute("""
                UPDATE users
                SET email = %s,
                    password = %s
                WHERE id = %s
            """, (
                email,
                new_password,
                user["id"]
            ))

        else:

            cursor.execute("""
                UPDATE users
                SET email = %s
                WHERE id = %s
            """, (
                email,
                user["id"]
            ))

        db.commit()

        return jsonify({
            "success": True,
            "message": "Account settings updated successfully"
        })

    except mysql.connector.IntegrityError:
        db.rollback()

        return jsonify({
            "success": False,
            "message": "This email is already registered."
        }), 400

    except Exception as e:
        db.rollback()

        print("Save Settings Error:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
# =========================================================
# Twilio Voice Webhook
# =========================================================

@app.route("/voice", methods=["GET", "POST"])
def voice():
    response = VoiceResponse()

    response.say(
        "Hello. You are connected with the AI Voice Calling Agent. "
        "How can I help you today?",
        voice="alice"
    )

    gather = response.gather(
        input="speech",
        action=f"{BASE_URL}/process-speech",
        method="POST",
        speech_timeout="auto",
        language="en-IN"
    )

    gather.say(
        "Please tell me how I can help you.",
        voice="alice"
    )

    response.redirect(f"{BASE_URL}/voice")

    return str(response)




def get_knowledge_base_text():
    cursor.execute("""
        SELECT title, category, content
        FROM knowledge_base
        ORDER BY updated_at DESC
    """)

    rows = cursor.fetchall()

    if not rows:
        return "No knowledge base information is currently available."

    knowledge = []

    for row in rows:
        knowledge.append(
            f"Title: {row['title']}\n"
            f"Category: {row['category']}\n"
            f"Content: {row['content']}"
        )

    return "\n\n".join(knowledge)






@app.route("/process-speech", methods=["POST"])
def process_speech():
    try:
        user_text = request.form.get("SpeechResult", "").strip()
        call_sid = request.form.get("CallSid")

        print("User said:", user_text)

        if not user_text:
            # existing code
            ...

        # Save user speech to transcript
        if call_sid and user_text:

            cursor.execute(
                """
                UPDATE calls
                SET transcript = CONCAT(
                    COALESCE(transcript, ''),
                    %s
                )
                WHERE call_sid = %s
                """,
                (
                    f"User: {user_text}\n",
                    call_sid
                )
            )

            db.commit()

        knowledge = get_knowledge_base_text()

        prompt = f"""
You are an AI Voice Calling Agent.

You are speaking to a customer on a phone call.

IMPORTANT RULES:
1. Answer ONLY using the Knowledge Base below.
2. Do not invent information.
3. If the answer is not available in the Knowledge Base,
   politely say that you do not have that information.
4. Keep responses short and natural because this is a phone conversation.
5. Do not use markdown.
6. Do not use bullet points.
7. Speak naturally and professionally.

KNOWLEDGE BASE:
{knowledge}

USER:
{user_text}

Give the best short spoken response.
"""

        ai_response = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        answer = ai_response.choices[0].message.content.strip()

        print("AI response:", answer)
                # Save AI response to transcript
        if call_sid and answer:

            cursor.execute(
                """
                UPDATE calls
                SET transcript = CONCAT(
                    COALESCE(transcript, ''),
                    %s
                )
                WHERE call_sid = %s
                """,
                (
                    f"AI: {answer}\n",
                    call_sid
                )
            )

            db.commit()

        response = VoiceResponse()

        response.say(
            answer,
            voice="alice"
        )

        gather = response.gather(
            input="speech",
            action=f"{BASE_URL}/process-speech",
            method="POST",
            speech_timeout="auto",
            language="en-IN"
        )

        gather.say(
            "How else can I help you?",
            voice="alice"
        )

        response.redirect(f"{BASE_URL}/voice")

        return str(response)

    except Exception as e:
        print("AI Conversation Error:", e)

        response = VoiceResponse()

        response.say(
            "Sorry, I am having trouble processing your request. "
            "Please try again.",
            voice="alice"
        )

        response.redirect(f"{BASE_URL}/voice")

        return str(response)


# =========================================================
# Recording Callback
# =========================================================

@app.route("/recording", methods=["POST"])
def recording():

    try:

        recording_url = request.form.get("RecordingUrl")

        call_sid = request.form.get("CallSid")

        recording_duration = request.form.get(
            "RecordingDuration"
        )


        print("Recording URL:", recording_url)

        print("Call SID:", call_sid)

        print("Recording Duration:", recording_duration)


        if not call_sid:

            return "OK"


        # Update recording information

        cursor.execute(
            """
            UPDATE calls

            SET
                recording_url = %s,
                duration = %s

            WHERE call_sid = %s
            """,
            (
                recording_url,
                int(recording_duration)
                if recording_duration
                else 0,

                call_sid
            )
        )

        db.commit()


        return "OK"


    except Exception as e:

        print("Recording Error:", e)

        return "Error"
    
    

# =========================================================
# Play Recording
# =========================================================

@app.route("/recording/<int:call_id>", methods=["GET"])
def play_recording(call_id):
    print("===== RECORDING ENDPOINT HIT =====")
    print("Call ID:", call_id)

    try:

        # Get recording URL from database
        cursor.execute(
            """
            SELECT recording_url
            FROM calls
            WHERE id = %s
            """,
            (call_id,)
        )

        call = cursor.fetchone()

        if not call or not call["recording_url"]:
            return jsonify({
                "success": False,
                "message": "Recording not available"
            }), 404

        recording_url = call["recording_url"]
        print("================================")
        print("Call ID:", call_id)
        print("Recording URL from DB:", recording_url)
        print("Twilio SID:", TWILIO_ACCOUNT_SID[:6] + "...")
        print("Auth token loaded:", bool(TWILIO_AUTH_TOKEN))
        print("================================")

        # Twilio recording URL returns audio when .wav is added
        audio_url = recording_url + ".wav"
        

        print("Final audio URL:", audio_url)
        # Authenticate with Twilio
        twilio_response = requests.get(
            audio_url,
            auth=(
                TWILIO_ACCOUNT_SID,
                TWILIO_AUTH_TOKEN
            )
        )
        print("Twilio response status:", twilio_response.status_code)

        if twilio_response.status_code != 200:
            print(
                "Recording fetch error:",
                twilio_response.status_code
            )

            return jsonify({
                "success": False,
                "message": "Unable to fetch recording"
            }), 500

        return Response(
            twilio_response.content,
            mimetype="audio/wav"
        )

    except Exception as e:

        print("Play Recording Error:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
# =========================================================
# Call Status Callback
# =========================================================

@app.route("/call-status", methods=["POST"])
def call_status():

    try:

        call_sid = request.form.get("CallSid")
        status = request.form.get("CallStatus")
        duration = request.form.get("CallDuration")

        print(
            "Call Status:",
            call_sid,
            status,
            duration
        )

        # Update call status and duration
        cursor.execute(
            """
            UPDATE calls
            SET
                status = %s,
                duration = %s
            WHERE call_sid = %s
            """,
            (
                status,
                int(duration) if duration else 0,
                call_sid
            )
        )

        db.commit()

        # Generate summary only when call is completed
        if status == "completed":

            cursor.execute(
                """
                SELECT transcript
                FROM calls
                WHERE call_sid = %s
                """,
                (call_sid,)
            )

            call = cursor.fetchone()

            transcript = call["transcript"] if call else None

            if transcript:

                print("Generating call summary...")

                summary_prompt = f"""
You are an AI call summarization assistant.

Summarize the following phone call transcript.

Requirements:
1. Keep the summary short and clear.
2. Mention the main topic discussed.
3. Mention the customer's main question or request.
4. Mention the AI agent's response or information provided.
5. Do not invent information.
6. Do not use bullet points.
7. Write 2 to 4 sentences.

CALL TRANSCRIPT:
{transcript}

Generate the call summary.
"""

                summary_response = groq_client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=[
                        {
                            "role": "user",
                            "content": summary_prompt
                        }
                    ],
                    temperature=0.2
                )

                summary = (
                    summary_response
                    .choices[0]
                    .message
                    .content
                    .strip()
                )

                print("Call Summary:", summary)

                # Save summary in database
                cursor.execute(
                    """
                    UPDATE calls
                    SET summary = %s
                    WHERE call_sid = %s
                    """,
                    (summary, call_sid)
                )

                db.commit()

        return "OK"

    except Exception as e:

        print("Call Status Error:", e)

        return "Error"

# =========================================================
# Get Call History
# =========================================================

@app.route("/calls", methods=["GET"])
def get_calls():

    try:

        cursor.execute(
            """
            SELECT
                id,
                phone_number,
                call_sid,
                status,
                duration,
                recording_url,
                transcript,
                summary,
                created_at

            FROM calls

            ORDER BY created_at DESC
            """
        )


        data = cursor.fetchall()


        return jsonify(data)


    except Exception as e:

        print("Call History Error:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================================
# Get Single Call Details
# =========================================================

@app.route("/calls/<int:call_id>", methods=["GET"])
def get_call_details(call_id):

    try:

        cursor.execute(
            """
            SELECT
                id,
                phone_number,
                call_sid,
                status,
                duration,
                recording_url,
                transcript,
                summary,
                created_at

            FROM calls

            WHERE id = %s
            """,
            (call_id,)
        )


        call = cursor.fetchone()


        if not call:

            return jsonify({

                "success": False,

                "message": "Call not found"

            }), 404


        return jsonify(call)


    except Exception as e:

        print("Call Details Error:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================================
# Knowledge Base - Get All
# =========================================================

@app.route("/knowledge-base", methods=["GET"])
def get_knowledge_base():

    try:

        cursor.execute(
            """
            SELECT
                id,
                title,
                category,
                content,
                created_at,
                updated_at

            FROM knowledge_base

            ORDER BY updated_at DESC
            """
        )


        data = cursor.fetchall()


        return jsonify(data)


    except Exception as e:

        print("Knowledge Base Error:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================================
# Knowledge Base - Add
# =========================================================

@app.route("/knowledge-base", methods=["POST"])
def add_knowledge():

    try:

        data = request.get_json()


        title = data.get("title")

        category = data.get("category")

        content = data.get("content")


        if not title or not content:

            return jsonify({

                "success": False,

                "message": "Title and content are required"

            }), 400


        cursor.execute(
            """
            INSERT INTO knowledge_base
            (
                title,
                category,
                content
            )

            VALUES
            (%s, %s, %s)
            """,
            (
                title,
                category,
                content
            )
        )


        db.commit()


        return jsonify({

            "success": True,

            "message": "Knowledge added successfully",

            "id": cursor.lastrowid

        })


    except Exception as e:

        print("Add Knowledge Error:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================================
# Knowledge Base - Delete
# =========================================================

@app.route("/knowledge-base/<int:knowledge_id>", methods=["DELETE"])
def delete_knowledge(knowledge_id):

    try:

        cursor.execute(
            """
            DELETE FROM knowledge_base

            WHERE id = %s
            """,
            (knowledge_id,)
        )


        db.commit()


        return jsonify({

            "success": True,

            "message": "Knowledge deleted successfully"

        })


    except Exception as e:

        print("Delete Knowledge Error:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================================
# Run Server
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )


@app.route("/settings-data", methods=["GET"])
def get_settings_data():
    try:
        cursor.execute("""
            SELECT id, email
            FROM users
            WHERE id = 1
        """)

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        return jsonify({
            "success": True,
            "settings": {
                "email": user["email"]
            }
        })

    except Exception as e:
        print("Get Settings Error:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@app.route("/settings-data", methods=["POST"])
def save_settings_data():
    try:
        data = request.get_json()

        email = data.get("email", "").strip()
        current_password = data.get("currentPassword", "")
        new_password = data.get("newPassword", "")

        # Email required
        if not email:
            return jsonify({
                "success": False,
                "message": "Email / Login ID is required"
            }), 400


        # Get current user
        cursor.execute("""
            SELECT id, email, password
            FROM users
            WHERE id = 1
        """)

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404


        # Password change requested
        if new_password:

            # Current password required
            if not current_password:
                return jsonify({
                    "success": False,
                    "message": "Current password is required"
                }), 400


            # Verify current password
            if current_password != user["password"]:
                return jsonify({
                    "success": False,
                    "message": "Current password is incorrect"
                }), 400


            # Password length check
            if len(new_password) < 6:
                return jsonify({
                    "success": False,
                    "message": "New password must contain at least 6 characters"
                }), 400


            # Update email + password
            cursor.execute("""
                UPDATE users
                SET email = %s,
                    password = %s
                WHERE id = %s
            """, (
                email,
                new_password,
                user["id"]
            ))

        else:

            # Only update email
            cursor.execute("""
                UPDATE users
                SET email = %s
                WHERE id = %s
            """, (
                email,
                user["id"]
            ))


        db.commit()

        return jsonify({
            "success": True,
            "message": "Account settings updated successfully"
        })


    except mysql.connector.IntegrityError:
        db.rollback()

        return jsonify({
            "success": False,
            "message": "This email is already registered."
        }), 400


    except Exception as e:
        db.rollback()

        print("Save Settings Error:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
