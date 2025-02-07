import { HarmBlockThreshold, HarmCategory, GoogleGenerativeAI } from "@google/generative-ai";
const outputDiv = document.getElementById('output');
const statusDiv = document.getElementById('status');
let language = "en-US";

const sleep = ms => new Promise(r => setTimeout(r, ms));

let api_keys = [
    "V3JpdHRlbiBieSBBdXN0aW4gUGhpbGxpcHMgQXVnLVNlcCAyMDI0",
    "AIzaSyAkNOjhY-ayGISlV2yHXWIjrA-v0VOojHE",
    "VEhJUyBXQVMgTVkgSURFQS4gRmFsbCBvZiAyMDIz",
    "QWRkaXRpb25hbCBMaWJyYXJpZXMgTGljZW5zZXMgaW5jbHVkZWQ="
];

let languageMap = {
    "en": 101,
    "es": 282,
    "fr": 139,
    "de": 150,
    "ja": 185,
    "ko": 196,
    "zh": 59
};

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

var model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: `You greet students, answer their questions, and speak in a friendly tone. You speak to users ONLY in the language they speak to you in.`, safetySettings});

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
s.then(v => {voices = v;
    let listBox = document.getElementById("voices");
    let i = 0;
    for (let voice of voices) {
        let element = document.createElement("option");
        element.textContent = voice.voiceURI.toString().replace("Microsoft ", "");
        element.value = i;
        listBox.appendChild(element);

    }
    console.log(voices);
});

let fullContext = "";
let count = 0;

function initializeSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!window.SpeechRecognition) {
        statusDiv.textContent = "Speech recognition is not supported in this browser.";
        for (let btn of document.querySelectorAll(".langBtn")) {
            btn.disabled = true
        }
        return;
    }

    recognition = new window.SpeechRecognition();
    recognition.lang = language; // You can change the language
    recognition.interimResults = false; // Only final results
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        statusDiv.textContent = "Listening...";
        isListening = true;
    };

    recognition.onresult = async (event) => {
        const speechResult = event.results[0][0].transcript;
        //outputDiv.textContent = "You said: " + speechResult;
        statusDiv.textContent = "Processing...";
        await processUserSpeech(speechResult); // Call function to handle the transcribed text
    };

    recognition.onspeechend = () => {
        statusDiv.textContent = "Acknowledged response";
        count = 0;
        stopListening(); // Stop listening when speech ends
    };

    recognition.onerror = async (event) => {
        console.error("Speech Recognition Error:", event.error);
        statusDiv.textContent = "Error: " + event.error;
        if (event.error.toString() == "no-speech") {
            //This is the best thing ever
            count++;
            if (count > 5) {
                count = 0;
                outputDiv.innerHTML="<b>Try speaking to me!</b>";
                fullContext = "";
            }
        }
        stopListening();
        await sleep(200);
        startListening();
    };

    recognition.onend = () => {
        isListening = false;
        /*if (!isSpeaking) {
            // Restart listening only if not currently speaking
            startListening();
        }*/
    };
}

let hasStarted = false;



function restart() {
    if (!isListening && !isSpeaking && hasStarted) {
        statusDiv.textContent = "Restarting...";
        startListening();
        
    }
}

window.setInterval(restart, 10000);

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

let hasManuallySelectedVoice = false;
document.getElementById("voices").addEventListener("change", () => {
    hasManuallySelectedVoice = true;
});

function speak(text) {
    if ('speechSynthesis' in window) {
        isSpeaking = true;
        s = setSpeech();
        s.then(v => {
            speechSynthesisUtterance = new SpeechSynthesisUtterance(text);
            let getDesiredVoice = 0;
            if (hasManuallySelectedVoice) {
                getDesiredVoice = document.getElementById("voices").selectedIndex;
            }
            
            if (getDesiredVoice == null) {
                getDesiredVoice = languageMap[language];
            }
            if (v.length > getDesiredVoice) {
                speechSynthesisUtterance.voice = v[getDesiredVoice];
            } else {
                speechSynthesisUtterance.voice = v[14];
            }

            console.log(getDesiredVoice)

            speechSynthesisUtterance.rate = document.getElementById("rate").value;

            speechSynthesisUtterance.onstart = () => {
                statusDiv.textContent = "Speaking...";
                if (getMode() == "greeter") {
                    targetColor = {r: 50, g: 50, b: 255};
                } else if (getMode() == "sidekick") {
                    targetColor = {r: 50, g: 255, b: 50};
                } else if (getMode() == "general") {
                    targetColor = {r: 255, g: 50, b: 50};
                }
            };

            speechSynthesisUtterance.onend = () => {
                isSpeaking = false;
                statusDiv.textContent = "Speaking complete.";
                if (getMode() == "greeter") {
                    targetColor = {r: 0, g: 0, b: 255};
                } else if (getMode() == "sidekick") {
                    targetColor = {r: 0, g: 255, b: 0};
                } else if (getMode() == "general") {
                    targetColor = {r: 255, g: 0, b: 0};
                }
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
        })
    } else {
        statusDiv.textContent = "Text-to-speech not supported.";
        isSpeaking = false;
    }
}

let centerProfileDict = {
    "math": {
        "name": "Math Learning Center",
        "field": "",
        "location": "Tarrant County College",
        "additionalData": `- The Math Learning Center is open to all students, but specifically serves math and physics students best.
    - Assistants are available to assist you with your work if you need it, but they will not assist with quizzes or exams.
    - Assistants are knowledgeable on Algebra, Pre-calculus, Trigonometry, Statistics, Calculus, Contemporary Math, Differential Equations, Discrete Math, Physics, and more.
    - If you need to take an exam, ask a tutor for assistance.
    - If you need to make up an exam, you may be able to use the Math Testing Center. Talk to a tutor to get additional information.`
    },
    "computer-science": {
        "name": "Computer Learning Center",
        "field": "",
        "location": "Tarrant County College",
        "additionalData": `- The Computer Learning Center is open to all students, but specifically serves computer science students best.
    - Assistants are available to assist you with your work if you need it, but they will not assist with quizzes or exam.
    - Assistants are knowledgeable on Microsoft Office, C++, Java, Python, Web Programming, Networking, Cloud Computing, General Computer Usage, and more.
    - Students that need help with research assignments may ask the Library.
    - Students that need the Tech Support help desk (after attempting a manual password reset or sign-in issues) should call 817-515-8324.
    - If students express a need to work on graphics assignments, there is a dedicated Graphic Design lab located in NCAB.
    - If you need to take an exam, ask a tutor for assistance.`
    },
    "library": {
        "name": "Library",
        "field": "",
        "location": "Tarrant County College",
        "additionalData": `- The Library is open to all students and members of the community.
        - Students that need help with research assignments may ask library staff.
        - The library has a copying station on the second floor.
        - The library has 3d printers available on the first floor for all student use.
        - The library can loan devices to students for the semester, free of charge.
        - The library offers quiet study rooms that can be rented on the first floor.
        - The library has an article database available at library.tccd.edu.
        - You can renew materials online at library.tccd.edu the first time, but subsequent renewals must be done in-person
        - Late fees are largely nonexistent, but they may place a hold on your student account until returned.`
    }
}

let centerProfile = "math";

function getGreeterPrompt() {

    var time = new Date();
    let formattedTime = time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
    let profile = centerProfileDict[centerProfile];

    let greeterPrompt = `You are a greeter for ${profile.location} students and visitors. Don't bring up your name- let students ask for it (Cassidy).

    Your job is to continue, as a greeter, the following conversation. If it has not been done yet, ask users for their name and refer to them by it.

    You are allowed to discuss the following material:
    - Students must sign in at the kiosk with either their student ID or email address.
    - All Learning Commons services (Library and Learning Centers) are open 7:30 am - 9:00 pm Monday through Thursday, 7:30 - 5:00 pm Friday, and 10:00 - 4:00 pm Saturday.
    ${profile.additionalData}

    You are also allowed to make general smalltalk with students. You may respond in the same language the student has spoken to you in, you can speak any language.

    It is currently ${formattedTime}. If that time is past 8:30 pm, inform the student that the ${profile.name} will be closing soon (if it has not been done already).

    Simply provide your response, with no formatting. Keep your response under 30 words.
    
    The conversation begins below:`

    return greeterPrompt;
}

function getSidekickPrompt() {
    let profile = centerProfileDict[centerProfile];
    let sidekickPrompt = `You are a assistant for ${profile.location} students and visitors. Don't bring up your name- let students ask for it (Cassidy).

    Your job is to continue, as an assistant, the following conversation.

    You assist students in their learning. They may ask you questions and you will answer them. You primarily serve the ${profile.name}.
    Your answers are no longer than 100 words. Your responses should be informative and factual.
    You should inquire as to the subject that the student is studying, if you have not done so.
    While you should entertain them with smalltalk if they so desire, you should not allow it to persist long, and you should work to keep them focused.
    
    The conversation begins below:`

    return sidekickPrompt;
}

function getGeneralPrompt() {
    return `You are a general assistant. You maintain a formal attitude and respond/do as instructed to. Your name is Cassidy.
    
    Your job is to continue, as an assistant, the following conversation.
    
    The conversation begins below:`;
}

const radioButtons = document.getElementsByName("mode");
const radioButtons2 = document.getElementsByName("profile");

function getMode() {
    let selectedValue = "greeter";

    // Loop through the radio buttons to find the selected one
    for (let i = 0; i < radioButtons.length; i++) {
        if (radioButtons[i].checked) {
        selectedValue = radioButtons[i].value;
        break; // Exit the loop once a selected button is found
        }
    }
    return selectedValue;
}

function getProfile() {
    let selectedValue = "math";

    for (let i = 0; i < radioButtons2.length; i++) {
        if (radioButtons2[i].checked) {
            selectedValue = radioButtons2[i].value;
            break;
        }
    }
    return selectedValue;
}

for (let button of radioButtons) {
    button.addEventListener("change", () => {
        console.log("RESET");
        fullContext = "";
        if (getMode() == "greeter") {
            targetColor = {r: 0, g: 0, b: 50};
        } else if (getMode() == "sidekick") {
            targetColor = {r: 0, g: 50, b: 0};
        } else if (getMode() == "general") {
            targetColor = {r: 50, g: 0, b: 0};
        }
    });
}

for (let button of radioButtons2) {
    button.addEventListener("change", () => {
        console.log("RESET");
        fullContext = "";
    });
}



async function processUserSpeech(speechResult) {
    // Replace this with your logic to generate a response based on speechResult
    let responseText;

    fullContext += `\nUser: ${speechResult} \n`;
    centerProfile = getProfile();

    let p = "";
    if (getMode() == "greeter") {
        p = getGreeterPrompt();
    } else if (getMode() == "sidekick") {
        p = getSidekickPrompt();
    } else if (getMode() == "general") {

        p = getGeneralPrompt();
    }

    let prompt = `${p} \n\n ${fullContext}`

    console.log(prompt);

    if (getMode() == "greeter") {
        targetColor = {r: 0, g: 0, b: 30};
    } else if (getMode() == "sidekick") {
        targetColor = {r: 0, g: 30, b: 0};
    } else if (getMode() == "general") {
        targetColor = {r: 30, g: 0, b: 0};
    }
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

for (let btn of document.querySelectorAll(".langBtn")) {
    btn.addEventListener('click', () => {
        if (!isListening && !isSpeaking) {
            startListening();
            document.getElementById("languages").style.display="none";
            language = btn.id;
            document.getElementById("maxwidth").style.opacity=0.2;
            hasStarted = true;

            if (getMode() == "greeter") {
                targetColor = {r: 0, g: 0, b: 255};
            } else if (getMode() == "sidekick") {
                targetColor = {r: 0, g: 255, b: 0};
            } else if (getMode() == "general") {
                targetColor = {r: 255, g: 0, b: 0};
            }
        }
    });
}

function lerp(a, b, t) {
    return a * (1-t) + b * t;
}

let color = {r: 0, g: 0, b: 0};
let targetColor = {r: 0, g: 0, b: 50};


const speechPart1 = document.getElementById('circle1');
const speechPart2 = document.getElementById('circle2');
const speechPart3 = document.getElementById('circle3');

let t = 0;
let factor = 1;
window.setInterval(() => {
    color = {r: lerp(color.r, targetColor.r, 0.05), g: lerp(color.g, targetColor.g, 0.05), b: lerp(color.b, targetColor.b, 0.05)};
    let newFactor = 1 * (isListening ? 0.4 : 1) * (isSpeaking ? 1.5 : 1);
    factor = lerp(factor, newFactor, 0.05);

    let f1 = (Math.abs(Math.sin(t)) * 0.75 + 0.25);
    let speech1Height =  f1* factor * 200;
    speechPart1.style.height = `${speech1Height}px`

    let f2 = (Math.abs(Math.sin(t+0.2)) * 0.75 + 0.25);
    let speech2Height = f2 * factor * 200;
    speechPart2.style.height = `${speech2Height}px`

    let f3 = (Math.abs(Math.sin(t+0.4)) * 0.75 + 0.25);
    let speech3Height = f3 * factor * 200;
    speechPart3.style.height = `${speech3Height}px`

    let speech1Color = {r: lerp(0.5, color.r, Math.pow(f1, 2)), g: lerp(0.5, color.g, Math.pow(f1, 2)), b: lerp(0.5, color.b, Math.pow(f1, 2))};
    speechPart1.style.backgroundColor = `rgb(${speech1Color.r}, ${speech1Color.g}, ${speech1Color.b})`;

    let speech2Color = {r: lerp(0.5, color.r, Math.pow(f2, 2)), g: lerp(0.5, color.g, Math.pow(f2, 2)), b: lerp(0.5, color.b, Math.pow(f2, 2))};
    speechPart2.style.backgroundColor = `rgb(${speech2Color.r}, ${speech2Color.g}, ${speech2Color.b})`;

    let speech3Color = {r: lerp(0.5, color.r, Math.pow(f3, 2)), g: lerp(0.5, color.g, Math.pow(f3, 2)), b: lerp(0.5, color.b, Math.pow(f3, 2))};
    speechPart3.style.backgroundColor = `rgb(${speech3Color.r}, ${speech3Color.g}, ${speech3Color.b})`;


    
    t+= 0.02;
}, 10)



// Initialize
initializeSpeechRecognition();