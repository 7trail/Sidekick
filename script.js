import { HarmBlockThreshold, HarmCategory, GoogleGenerativeAI } from "@google/generative-ai";
const outputDiv = document.getElementById('output');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');

let api_keys = [
    "V3JpdHRlbiBieSBBdXN0aW4gUGhpbGxpcHMgQXVnLVNlcCAyMDI0",
    "AIzaSyAkNOjhY-ayGISlV2yHXWIjrA-v0VOojHE",
    "VEhJUyBXQVMgTVkgSURFQS4gRmFsbCBvZiAyMDIz",
    "QWRkaXRpb25hbCBMaWJyYXJpZXMgTGljZW5zZXMgaW5jbHVkZWQ="
];

const API_KEY = api_keys[1];

// Access your API key (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(API_KEY);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: `You greet students, answer their questions, and speak in a friendly tone.`, safetySettings});

let recognition; // SpeechRecognition instance
let isListening = false;
let isSpeaking = false;
let speechSynthesisUtterance;

let voices = [];

function setSpeech() {
    return new Promise(
        function (resolve, reject) {
            let synth = window.speechSynthesis;
            let id;

            id = setInterval(() => {
                if (synth.getVoices().length !== 0) {
                    resolve(synth.getVoices());
                    clearInterval(id);
                }
            }, 10);
        }
    )
}

let s = setSpeech();
s.then(v => {voices = v

    console.log(voices);
});

let fullContext = "";

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

    recognition.onresult = async (event) => {
        const speechResult = event.results[0][0].transcript;
        outputDiv.textContent = "You said: " + speechResult;
        statusDiv.textContent = "Processing...";
        await processUserSpeech(speechResult); // Call function to handle the transcribed text
    };

    recognition.onspeechend = () => {
        statusDiv.textContent = "Stopped listening.";
        stopListening(); // Stop listening when speech ends
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        statusDiv.textContent = "Error: " + event.error;
        if (event.error.toString() == "no-speech") {
            //This is the best thing ever
            fullContext = "";
        }
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
        if (voices.length > 70) {
            speechSynthesisUtterance.voice = voices[80];
        } else {
            speechSynthesisUtterance.voice = voices[14];
        }

        speechSynthesisUtterance.rate = document.getElementById("rate").value;

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



async function processUserSpeech(speechResult) {
    // Replace this with your logic to generate a response based on speechResult
    let responseText;

    fullContext += `\nUser: ${speechResult} \n`;

    let prompt = `You are a greeter for Tarrant County College students and visitors. Your job is to continue, as a greeter, the following conversation. Simply provide your response, with no formatting. Keep your response under 30 words. \n\n ${fullContext}`

    console.log(prompt);


    responseText = await getResponse(prompt, model);
    responseText = responseText.text;
    fullContext += `\nAI: ${responseText} \n`

    outputDiv.textContent = responseText;
    console.log(responseText);

    speak(responseText);
}



async function getResponse(prompt, mdl, depth) {
    if (mdl == null) {
        mdl = model;
    }
    //const prompt = textbox.value;
    if (depth == null) {
        depth = 0;
    }
    let contents = "";
    try {
        //console.log(prompt);
        let respo = await mdl.generateContent(prompt);
        respo = respo.response;
        
        //const result = respo.text();
        contents = respo;
        //console.log("**********RESULT*********\n\n\n\n\n\n");
        console.log(respo);
    } catch (error) {
        console.log(error);
        if (depth < 3) {
            contents = await getResponse(prompt,mdl, depth+1);
        }
        else {
            return {"contents":null, "text":"I'm sorry, can you please say that one more time for me?", "citations":null};
        }
    }
    
    return {"contents":contents, "text":contents.text(), "citations":contents.candidates[0].citationMetadata};
}


// Event Listeners
startButton.addEventListener('click', () => {
    if (!isListening && !isSpeaking) {
        startListening();
    }
});

function lerp(a, b, t) {
    return a * (1-t) + b * t;
}
const speechPart1 = document.getElementById('circle1');
const speechPart2 = document.getElementById('circle2');
const speechPart3 = document.getElementById('circle3');

let t = 0;
let factor = 1;
window.setInterval(() => {
    let newFactor = 1 * (isListening ? 0.4 : 1) * (isSpeaking ? 2 : 1);
    factor = lerp(factor, newFactor, 0.05);

    let speech1Height = (Math.abs(Math.sin(t)) * 0.75 + 0.25) * factor * 200;
    speechPart1.style.height = `${speech1Height}px`

    let speech2Height = (Math.abs(Math.sin(t+0.2)) * 0.75 + 0.25) * factor * 200;
    speechPart2.style.height = `${speech2Height}px`
    let speech3Height = (Math.abs(Math.sin(t+ 0.4)) * 0.75 + 0.25) * factor * 200;
    speechPart3.style.height = `${speech3Height}px`
    
    t+= 0.02;
}, 10)



// Initialize
initializeSpeechRecognition();