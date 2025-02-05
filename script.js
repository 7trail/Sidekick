const outputDiv = document.getElementById('output');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');

let recognition; // SpeechRecognition instance
let isListening = false;
let isSpeaking = false;
let speechSynthesisUtterance;

function initializeSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!window.SpeechRecognition) {
        statusDiv.textContent = "Speech recognition is not supported in this browser.";
        startButton.disabled = true;
        return;
    }

    recognition = new window.SpeechRecognition();
    recognition.lang = 'en-US'; // You can change the language
    recognition.interimResults = false; // Only final results
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        statusDiv.textContent = "Listening...";
        isListening = true;
    };

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        outputDiv.textContent = "You said: " + speechResult;
        statusDiv.textContent = "Processing...";
        processUserSpeech(speechResult); // Call function to handle the transcribed text
    };

    recognition.onspeechend = () => {
        statusDiv.textContent = "Stopped listening.";
        stopListening(); // Stop listening when speech ends
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        statusDiv.textContent = "Error: " + event.error;
        stopListening();
    };

    recognition.onend = () => {
        isListening = false;
        if (!isSpeaking) {
            // Restart listening only if not currently speaking
            startListening();
        }
    };
}


function startListening() {
    if (recognition && !isListening && !isSpeaking) {
        try {
            recognition.start();
        } catch (error) {
            console.error("Error starting recognition:", error);
            statusDiv.textContent = "Error starting: " + error.message;
            isListening = false;
        }
    }
}

function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        isSpeaking = true;
        speechSynthesisUtterance = new SpeechSynthesisUtterance(text);

        speechSynthesisUtterance.onstart = () => {
            statusDiv.textContent = "Speaking...";
        };

        speechSynthesisUtterance.onend = () => {
            isSpeaking = false;
            statusDiv.textContent = "Speaking complete.";

            // Restart listening after speaking is done
            startListening();
        };

        speechSynthesisUtterance.onerror = (event) => {
            console.error("TTS Error:", event.error);
            statusDiv.textContent = "TTS Error: " + event.error;
            isSpeaking = false;
            startListening();  // Try to recover and listen again
        };

        window.speechSynthesis.speak(speechSynthesisUtterance);
    } else {
        statusDiv.textContent = "Text-to-speech not supported.";
        isSpeaking = false;
    }
}

function processUserSpeech(speechResult) {
    // Replace this with your logic to generate a response based on speechResult
    let responseText;

    if (speechResult.toLowerCase().includes("hello")) {
        responseText = "Hello there! How can I help you today?";
    } else if (speechResult.toLowerCase().includes("goodbye")) {
        responseText = "Goodbye! Have a great day.";
    } else {
        responseText = "I'm sorry, I didn't understand that. Could you please repeat?";
    }

    speak(responseText);
}


// Event Listeners
startButton.addEventListener('click', () => {
    if (!isListening && !isSpeaking) {
        startListening();
    }
});

// Initialize
initializeSpeechRecognition();