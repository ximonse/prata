document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const convertBtn = document.getElementById('convertBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioElement = document.getElementById('audioElement');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    let audioBlob = null;
    
    convertBtn.addEventListener('click', async () => {
        const fullText = textInput.value.trim();
        if (!fullText) {
            alert('Vänligen skriv in text först');
            return;
        }
        
        // Kontrollera textlängden mot API-gränsen
        if (fullText.length > 4090) {
            alert(`Texten är för lång. Maxgränsen är 4090 tecken. Din text är ${fullText.length} tecken.`);
            return;
        }
        
        // Starta konverteringsprocessen
        convertBtn.disabled = true;
        convertBtn.textContent = 'Konverterar...';
        loadingIndicator.style.display = 'block';
        
        try {
            const response = await fetch('/.netlify/functions/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: fullText,
                    voice: voiceSelect.value
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API svarade med status: ${response.status}. ${errorText}`);
            }
            
            // Hantera svaret
            audioBlob = await response.blob();
            
            // Skapa URL för ljuduppspelning
            const audioUrl = URL.createObjectURL(audioBlob);
            audioElement.src = audioUrl;
            
            // Visa ljudspelaren
            audioPlayer.style.display = 'block';
            
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            // Återställ UI
            loadingIndicator.style.display = 'none';
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
