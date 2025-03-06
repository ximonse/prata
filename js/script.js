document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const convertBtn = document.getElementById('convertBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioElement = document.getElementById('audioElement');
    const downloadBtn = document.getElementById('downloadBtn');
    
    let audioBlob = null;
    
    convertBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Vänligen skriv in text först');
            return;
        }
        
        try {
            convertBtn.disabled = true;
            convertBtn.textContent = 'Konverterar...';
            
            const response = await fetch('/.netlify/functions/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    voice: voiceSelect.value
                })
            });
            
            if (!response.ok) {
                throw new Error('Något gick fel vid konverteringen');
            }
            
            // Hämta ljuddata som blob
            const data = await response.blob();
            audioBlob = data;
            
            // Skapa URL för ljuduppspelning
            const audioUrl = URL.createObjectURL(audioBlob);
            audioElement.src = audioUrl;
            
            // Visa ljudspelaren
            audioPlayer.style.display = 'block';
            
            // Återställ knappen
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        } catch (error) {
            alert(`Error: ${error.message}`);
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        }
    });
    
    downloadBtn.addEventListener('click', () => {
        if (!audioBlob) return;
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(audioBlob);
        a.download = 'text-till-tal.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});
