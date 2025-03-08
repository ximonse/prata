document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const convertBtn = document.getElementById('convertBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioElement = document.getElementById('audioElement');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    let audioBlob = null;
    let audioChunks = [];
    let currentChunkIndex = 0;
    let textChunks = [];
    
    convertBtn.addEventListener('click', async () => {
        const fullText = textInput.value.trim();
        if (!fullText) {
            alert('Vänligen skriv in text först');
            return;
        }
        
        // Dela upp texten i mindre bitar på ca 500 tecken (vid meningsgränser)
        textChunks = splitTextIntoChunks(fullText, 4060);
        audioChunks = [];
        currentChunkIndex = 0;
        
        // Visa information om segmentering
        alert(`Texten har delats upp i ${textChunks.length} segment för bearbetning. Varje segment kommer att konverteras separat.`);
        
        // Starta konverteringsprocessen
        convertBtn.disabled = true;
        convertBtn.textContent = `Konverterar segment 1/${textChunks.length}`;
        loadingIndicator.style.display = 'block';
        
        await processNextChunk();
    });
    
    async function processNextChunk() {
        if (currentChunkIndex >= textChunks.length) {
            // Alla segment har bearbetats, kombinera resultat
            finalizeAudio();
            return;
        }
        
        const chunkText = textChunks[currentChunkIndex];
        
        try {
            convertBtn.textContent = `Konverterar segment ${currentChunkIndex + 1}/${textChunks.length}`;
            
            const response = await fetch('/.netlify/functions/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: chunkText,
                    voice: voiceSelect.value
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API svarade med status: ${response.status}. ${errorText}`);
            }
            
            // Lägg till segment till samlingen
            const blob = await response.blob();
            audioChunks.push(blob);
            
            // Fortsätt med nästa segment
            currentChunkIndex++;
            await processNextChunk();
            
        } catch (error) {
            loadingIndicator.style.display = 'none';
            alert(`Error: ${error.message}`);
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        }
    }
    
    function finalizeAudio() {
        if (audioChunks.length === 0) {
            loadingIndicator.style.display = 'none';
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
            return;
        }
        
        try {
            // Om bara ett segment, använd det direkt
            if (audioChunks.length === 1) {
                audioBlob = audioChunks[0];
            } else {
                // För flera segment skulle vi behöva kombinera dem
                // Detta är förenklat, idealt skulle ljuden behöva sammanfogas korrekt
                audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            }
            
            // Skapa URL för ljuduppspelning
            const audioUrl = URL.createObjectURL(audioBlob);
            audioElement.src = audioUrl;
            
            // Visa ljudspelaren
            audioPlayer.style.display = 'block';
            
            // Återställ UI
            loadingIndicator.style.display = 'none';
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
            
        } catch (error) {
            loadingIndicator.style.display = 'none';
            alert(`Error vid finalisering: ${error.message}`);
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        }
    }
    
    // Hjälpfunktion för att dela upp text i segment vid meningsgränser
    function splitTextIntoChunks(text, maxLength) {
        const chunks = [];
        let startIndex = 0;
        
        while (startIndex < text.length) {
            let endIndex = Math.min(startIndex + maxLength, text.length);
            
            // Försök att avsluta vid en meningsgräns
            if (endIndex < text.length) {
                // Sök bakåt från maxLength efter en meningsgräns (punkt, frågetecken, utropstecken)
                const lastSentence = text.substring(endIndex - 30, endIndex).search(/[.!?]\s/);
                
                if (lastSentence !== -1) {
                    endIndex = endIndex - 30 + lastSentence + 2; // +2 för att inkludera punkten och mellanslaget
                }
            }
            
            chunks.push(text.substring(startIndex, endIndex));
            startIndex = endIndex;
        }
        
        return chunks;
    }
    
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
