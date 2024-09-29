document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('speak-form');
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const rateSelect = document.getElementById('rate-select');
    const pitchSelect = document.getElementById('pitch-select');

    const synth = window.speechSynthesis;
    let voices = [];

    const populateVoiceList = () => {
        voices = synth.getVoices();
        voiceSelect.innerHTML = '';
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = index;
            voiceSelect.appendChild(option);
        });
    };

    populateVoiceList();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const utterance = new SpeechSynthesisUtterance(textInput.value);
        utterance.voice = voices[voiceSelect.value];
        utterance.rate = rateSelect.value;
        utterance.pitch = pitchSelect.value;
        synth.speak(utterance);
    });
});
