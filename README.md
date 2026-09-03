## Project Architecture

```text
                         User
                          |
                          v
                +-------------------+
                |    Web Frontend   |
                | HTML / CSS / JS   |
                +---------+---------+
                          |
                          | HTTP API
                          v
                +-------------------+
                |   Flask Backend   |
                |      Python       |
                +---------+---------+
                          |
              +-----------+-----------+
              |           |           |
              v           v           v
          MySQL        Groq API     Twilio
         Database       AI Model    Voice API
              |                       |
              |                       v
              |                  Phone Call
              |                       |
              +-----------<------------+
```How the Application Works
1. User Login

The user logs into the application through the web interface.

The backend validates the provided credentials against the users stored in the MySQL database.

2. Make an AI Call

The user enters a mobile number from the Make Call page.

The frontend sends the phone number to the Flask backend.
User
  ↓
Make Call Page
  ↓
POST /make-call
  ↓
Flask Backend
  ↓
Twilio
  ↓
Customer's Phone
Twilio initiates the outbound call and connects it to the application's voice webhook.

3. AI Voice Conversation

When the call is answered, Twilio connects the call to the Flask /voice endpoint.

The application collects the caller's speech using Twilio speech input.

The speech is sent to the backend where it is processed by the AI model through Groq.

The AI response is then converted into speech and returned to the caller through Twilio.

Caller speaks
     ↓
Twilio Speech Recognition
     ↓
Flask Backend
     ↓
Groq AI Model
     ↓
AI Response
     ↓
Twilio Text-to-Speech
     ↓
Caller hears response

The process continues until the call ends.

Knowledge Base

The application includes a Knowledge Base where information can be added, updated, and deleted.

Each Knowledge Base entry contains:

Title
Category
Content
Created date
Updated date

The AI uses the available Knowledge Base information while generating responses.

This allows the voice agent to answer questions based on application-specific information rather than relying only on general model knowledge.

AI Model

The application uses the Groq API for AI inference.

The current model configured in the application is:

openai/gpt-oss-20b

Groq provides the inference API used by the Flask backend to communicate with the model.

The AI is used for:

Generating conversational responses
Processing caller questions
Generating automatic call summaries
Call Recording

Calls are recorded through Twilio.

After a call is completed, the recording information is stored in the application's MySQL database.

The application provides a backend recording endpoint so recordings can be played through the dashboard without exposing the Twilio recording URL directly to the frontend.

Call Transcript

During the conversation, caller and AI messages are stored as a transcript.

Example:

User: What are your working hours?

AI: Our working hours are from 9 AM to 6 PM.

User: Do you provide support on weekends?

AI: Please refer to the available support information in the Knowledge Base.

The complete transcript is available from the Call History section.

Automatic Call Summary

After a call is completed, the stored transcript is sent to the AI model to generate a short summary.

The summary includes:

Main topic discussed
Customer's main question or request
Information provided by the AI agent

The generated summary is stored in the MySQL database and displayed in Call History.

Call History

The Call History section provides information about previous calls.

It includes:

Call ID
Phone number
Call status
Call duration
Call date/time
Recording
Transcript
AI-generated summary

Users can also search and filter call records.

Technology Stack
Frontend
HTML5
CSS3
JavaScript
Backend
Python
Flask
Flask-CORS
Database
MySQL
Voice & Telephony
Twilio
AI
Groq API
openai/gpt-oss-20b
Development Tools
Git
GitHub
ngrok
Project Structure
ai-voice-calling-agent/
│
├── Frontend/
│   ├── call-history.html
│   ├── call-history.js
│   ├── dashboard.html
│   ├── dashboard.js
│   ├── knowledge-base.html
│   ├── knowledge-base.js
│   ├── login.html
│   ├── make-call.html
│   ├── make-call.js
│   ├── settings.html
│   ├── settings.js
│   └── style.css
│
├── app.py
├── requirements.txt
├── .gitignore
└── .env

.env is intentionally excluded from the Git repository because it contains sensitive configuration values.

Database Structure

The application uses a MySQL database named:

school

Main tables:

users

Stores application user account information.

id
name
email
password
created_at
knowledge_base

Stores AI Knowledge Base information.

id
title
category
content
created_at
updated_at
calls

Stores call-related information.

id
phone_number
call_sid
status
duration
recording_url
transcript
summary
created_at
Environment Variables

The application uses environment variables for sensitive configuration.

Create a .env file in the project root:

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_NUMBER=your_twilio_phone_number

BASE_URL=your_public_backend_url

GROQ_API_KEY=your_groq_api_key

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=school
Security

Never commit the .env file to GitHub.

The project includes .gitignore to prevent sensitive files from being uploaded.

Installation
1. Clone the Repository
git clone https://github.com/Priprajapati122/ai-voice-calling-agent.git

Navigate to the project directory:

cd ai-voice-calling-agent
2. Install Python Dependencies

Install the required packages:

pip install -r requirements.txt
3. Configure Environment Variables

Create a .env file and add the required configuration:

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_NUMBER=your_twilio_phone_number
BASE_URL=your_public_backend_url
GROQ_API_KEY=your_groq_api_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=school
4. Configure MySQL

Create the required database and tables in MySQL.

The application expects the database:

school

with the following tables:

users
knowledge_base
calls
5. Run the Flask Backend

Run:

python app.py

The development server will start at:

http://127.0.0.1:5000
Local Development with ngrok

Twilio requires publicly accessible webhook URLs.

For local development, ngrok can expose the Flask server to the internet.

Example:

ngrok http 5000

Use the generated HTTPS URL as the application's:

BASE_URL=https://your-ngrok-url

This allows Twilio to communicate with the locally running Flask application.

ngrok is intended for development/testing. Production deployment should use a publicly accessible HTTPS backend.

API Endpoints

The Flask backend provides endpoints for the main application functionality.

Endpoint	Method	Purpose
/login	POST	User authentication
/make-call	POST	Initiate outbound call
/voice	GET/POST	Twilio voice webhook
/process-speech	POST	Process caller speech
/call-status	POST	Update call status and generate summary
/recording	POST	Receive recording callback
/recording/<call_id>	GET	Stream call recording
/settings-data	GET	Retrieve account settings
/settings-data	POST	Update account settings
Deployment Architecture

The application can be deployed using separate services while still functioning as a single application.

Frontend Hosting
      |
      | HTTPS API Requests
      v
Flask Backend
      |
      +-----------> Cloud MySQL
      |
      +-----------> Groq API
      |
      +-----------> Twilio
                         |
                         v
                    Phone Network

The frontend communicates with the deployed Flask backend using the backend's public HTTPS URL.

Security Considerations

The project follows several basic security practices:

Sensitive credentials are stored in environment variables.
.env is excluded from Git.
Call recordings are not stored in the Git repository.
Twilio recording URLs are accessed through a backend endpoint.
API credentials are not hardcoded into frontend JavaScript.

For production use, additional security improvements should be implemented, including:

Password hashing
Proper session/JWT-based authentication
HTTPS enforcement
Authentication and authorization for API endpoints
Input validation
Rate limiting
Secure CORS configuration
Production-grade database credentials
Secure handling of call recordings
Logging and monitoring
Current Status

The application currently supports the core AI voice calling workflow:
Login
  ↓
Dashboard
  ↓
Make Call
  ↓
Twilio Outbound Call
  ↓
AI Voice Conversation
  ↓
Recording + Transcript
  ↓
AI Summary
  ↓
Call History
Future Improvements

Potential future enhancements include:

Advanced RAG-based Knowledge Base
Vector database integration
Improved authentication and authorization
Password hashing
Multi-user support
Role-based access control
Advanced analytics dashboard
Call sentiment analysis
Multiple AI voice options
Multiple language support
Production monitoring
Cloud-based recording storage
Author

Priya Prajapati

GitHub:

https://github.com/Priprajapati122

License

This project is intended for educational, development, and demonstration purposes.
