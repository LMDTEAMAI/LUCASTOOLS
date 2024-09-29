document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const convertButton = document.getElementById('convert-button');
    const textOutput = document.getElementById('text-output');
    const debugOutput = document.getElementById('debug-output');

    const logDebug = (message) => {
        debugOutput.innerText += `${message}\n`;
        console.log(message);
    };

    convertButton.addEventListener('click', async () => {
        if (imageInput.files.length === 0) {
            alert('Please select an image file.');
            return;
        }

        const file = imageInput.files[0];
        logDebug(`Selected file: ${file.name}`);

        const reader = new FileReader();

        reader.onload = async (event) => {
            const image = new Image();
            image.src = event.target.result;
            logDebug('Image loaded.');

            image.onload = async () => {
                logDebug('Starting OCR process...');
                const worker = await Tesseract.createWorker('eng', 1, {
                    logger: m => logDebug(`Progress: ${JSON.stringify(m)}`)
                });

                try {
                    const { data: { text } } = await worker.recognize(image);
                    logDebug('OCR process completed.');
                    textOutput.value = text;
                    await worker.terminate();
                } catch (error) {
                    logDebug(`Error: ${error.message}`);
                    console.error('Error:', error);
                    alert('An error occurred. Please try again.');
                }
            };

            image.onerror = (error) => {
                logDebug(`Image load error: ${error.message}`);
                console.error('Image load error:', error);
            };
        };

        reader.onerror = (error) => {
            logDebug(`File read error: ${error.message}`);
            console.error('File read error:', error);
        };

        reader.readAsDataURL(file);
    });
});