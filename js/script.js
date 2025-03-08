document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM laddad, JavaScript körs');
    
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const convertBtn = document.getElementById('convertBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioElement = document.getElementById('audioElement');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const testBtn = document.getElementById('testBtn');
    
    let audioBlob = null;
    
    // Kontrollera att elementen hittades
    console.log('Element hittade:', {
        textInput: !!textInput,
        voiceSelect: !!voiceSelect,
        convertBtn: !!convertBtn,
        audioPlayer: !!audioPlayer,
        audioElement: !!audioElement,
        downloadBtn: !!downloadBtn,
        loadingIndicator: !!loadingIndicator,
        testBtn: !!testBtn
    });
    
    convertBtn.addEventListener('click', async () => {
        console.log('Konvertera-knapp klickad');
        
        const text = textInput.value.trim();
        console.log('Text att konvertera:', text);
        
        if (!text) {
            console.log('Ingen text angiven, avbryter');
            alert('Vänligen skriv in text först');
            return;
        }
        
        try {
            console.log('Påbörjar konvertering...');
            
            // Visa att något händer
            convertBtn.disabled = true;
            convertBtn.textContent = 'Konverterar...';
            
            if (loadingIndicator) {
                loadingIndicator.style.display = 'block';
                console.log('Visar laddningsindikator');
            } else {
                console.log('VARNING: loadingIndicator hittades inte');
            }
            
            console.log('Skickar förfrågan till API...');
            console.log('Förfrågans URL:', '/.netlify/functions/text-to-speech');
            console.log('Förfrågans data:', {
                text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                voice: voiceSelect.value
            });
            
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
            
            console.log('Svar mottaget från API', {
                status: response.status,
                ok: response.ok
            });
            
            // Dölj laddningsindikatorn oavsett resultat
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API-fel:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`API svarade med status: ${response.status}. ${errorText}`);
            }
            
            console.log('Hämtar ljuddata...');
            
            // Hämta ljuddata som blob
            const data = await response.blob();
            audioBlob = data;
            
            console.log('Ljuddata mottagen', {
                type: data.type,
                size: data.size
            });
            
            // Skapa URL för ljuduppspelning
            const audioUrl = URL.createObjectURL(audioBlob);
            audioElement.src = audioUrl;
            
            // Visa ljudspelaren
            audioPlayer.style.display = 'block';
            
            // Återställ knappen
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
            
            console.log('Konvertering slutförd!');
        } catch (error) {
            console.error('Ett fel inträffade:', error);
            
            // Dölj laddningsindikatorn vid fel
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            alert(`Error: ${error.message}`);
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        }
    });
    
    downloadBtn.addEventListener('click', () => {
        if (!audioBlob) return;
        
        console.log('Laddar ner ljudfil...');
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(audioBlob);
        a.download = 'text-till-tal.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // Testa Netlify-funktionen
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            console.log('Testar Netlify-funktion...');
            try {
                const response = await fetch('/.netlify/functions/test-endpoint', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: true })
                });
                
                const data = await response.json();
                console.log('Test-respons:', data);
                alert(`Test resultat: ${JSON.stringify(data, null, 2)}`);
            } catch (error) {
                console.error('Test-fel:', error);
                alert(`Test-fel: ${error.message}`);
            }
        });
    }
});
