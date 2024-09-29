document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('openai-form');
    const responseDiv = document.getElementById('response');
    let chatHistory = [];
    const userInput = document.getElementById('user-input'); // Declare this only once

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: userInput.value })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.statusText}`);
                }

                const data = await response.json();
                // Handle the response data
            } catch (error) {
                console.error('Error details:', error);
                console.error('Response status:', error.response?.status);
                console.error('Response text:', await error.response?.text());
                // Handle the error
            }
        });
    }
});

function validateForm() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    let isValid = true;

    if (name.trim() === '') {
        alert('Name is required');
        isValid = false;
    }

    if (email.trim() === '') {
        alert('Email is required');
        isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        alert('Email is invalid');
        isValid = false;
    }

    return isValid;
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateForm()) {
            // Proceed with form submission
            // ... existing code ...
        }
    });
}
