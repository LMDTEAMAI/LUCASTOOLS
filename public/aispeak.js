document.addEventListener('DOMContentLoaded', () => {
    const startRecordingButton = document.getElementById('start-recording');
    const transcriptDiv = document.getElementById('transcript');

    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            startRecordingButton.disabled = true;
            startRecordingButton.innerText = 'Recording...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            transcriptDiv.innerText += `\n${transcript}`;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            transcriptDiv.innerText += '\nAn error occurred. Please try again.';
        };

        recognition.onend = () => {
            startRecordingButton.disabled = false;
            startRecordingButton.innerText = 'Start Recording';
        };

        startRecordingButton.addEventListener('click', () => {
            recognition.start();
        });
    } else {
        transcriptDiv.innerText = 'Speech recognition not supported in this browser.';
    }
});
