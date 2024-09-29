document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('openai-form');
    const responseDiv = document.getElementById('response');
    let chatHistory = [];

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userInput = document.getElementById('user-input').value;

            // Add user input to chat history
            chatHistory.push({ role: 'user', content: userInput });

            try {
                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ messages: chatHistory })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.statusText}`);
                }

                const data = await response.json();
                const assistantMessage = data.choices[0].message.content;

                // Add assistant response to chat history
                chatHistory.push({ role: 'assistant', content: assistantMessage });

                // Display the assistant's response
                responseDiv.innerText += `\nUser: ${userInput}\nAssistant: ${assistantMessage}\n`;
            } catch (error) {
                console.error('Error:', error);
                responseDiv.innerText += '\nAn error occurred. Please try again.\n';
            }
        });
    }
});
