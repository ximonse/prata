document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM laddad, JavaScript körs');
    
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const convertBtn = document.getElementById('convertBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const charCount = document.getElementById('charCount');
    const costEstimate = document.getElementById('costEstimate');
    const fileUpload = document.getElementById('fileUpload');
    const uploadStatus = document.getElementById('upload-status');
    
    const MAX_CHARS_PER_SEGMENT = 4090;
    let audioBlobs = [];
    
    // Ställ in arbetssökvägen för PDF.js
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    // Uppdatera kostnad och teckenantal medan användaren skriver
    textInput.addEventListener('input', updateCounters);
    
    function updateCounters() {
        const text = textInput.value;
        const characters = text.length;
        const cost = (characters / 1000 * 0.15).toFixed(2).replace('.', ',');
        
        charCount.textContent = characters;
        costEstimate.textContent = cost;
        
        // Visa antalet segment som kommer att skapas
        const segments = Math.ceil(characters / MAX_CHARS_PER_SEGMENT);
        const segmentCount = document.getElementById('segmentCount');
        if (segmentCount) {
            segmentCount.textContent = segments;
        }
    }
    
    // Extrahera text från PDF
    async function extractTextFromPDF(file) {
        if (!window.pdfjsLib) {
            alert('PDF.js biblioteket kunde inte laddas. Kan inte läsa PDF-filer.');
            return '';
        }
        
        try {
            uploadStatus.innerHTML = '<div class="spinner"></div><p>Bearbetar PDF-fil...</p>';
            uploadStatus.style.display = 'block';
            
            // Läs filen som en ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Ladda PDF-dokumentet
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            console.log(`PDF laddad, antal sidor: ${pdf.numPages}`);
            
            let allText = '';
            
            // Extrahera text från varje sida
            for (let i = 1; i <= pdf.numPages; i++) {
                uploadStatus.innerHTML = `<div class="spinner"></div><p>Bearbetar sida ${i} av ${pdf.numPages}...</p>`;
                
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Kombinera texten från alla textdelar på sidan
                const pageText = textContent.items.map(item => item.str).join(' ');
                allText += pageText + '\n\n';
            }
            
            uploadStatus.style.display = 'none';
            return allText;
        } catch (error) {
            console.error('Fel vid läsning av PDF:', error);
            uploadStatus.innerHTML = `<p class="error">Kunde inte läsa PDF: ${error.message}</p>`;
            return '';
        }
    }
    
    // Hantera filuppladdning
    fileUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            if (file.type === 'application/pdf') {
                // Hantera PDF-fil
                const pdfText = await extractTextFromPDF(file);
                textInput.value = pdfText;
            } else {
                // Hantera textfil
                const reader = new FileReader();
                reader.onload = (e) => {
                    textInput.value = e.target.result;
                };
                reader.readAsText(file);
            }
            
            // Uppdatera räknare när innehållet är inläst
            setTimeout(updateCounters, 100);
        } catch (error) {
            console.error('Fel vid filuppladdning:', error);
            alert(`Kunde inte läsa fil: ${error.message}`);
        }
    });
    
    // Funktion för att dela upp texten i segment på max 4090 tecken
    function splitTextIntoSegments(text) {
        const segments = [];
        let remainingText = text;
        
        while (remainingText.length > 0) {
            if (remainingText.length <= MAX_CHARS_PER_SEGMENT) {
                segments.push(remainingText);
                break;
            }
            
            // Hitta lämplig brytpunkt (helst vid meningsslut eller styckebrytning)
            let breakPoint = MAX_CHARS_PER_SEGMENT;
            
            // Sök bakåt från maxgränsen efter punkter, frågetecken, utropstecken eller styckebrytningar
            for (let i = breakPoint; i > breakPoint - 100 && i > 0; i--) {
                const char = remainingText.charAt(i);
                if (char === '.' || char === '!' || char === '?' || char === '\n') {
                    breakPoint = i + 1;
                    break;
                }
            }
            
            // Om ingen bra brytpunkt hittades, försök med mellanslag
            if (breakPoint === MAX_CHARS_PER_SEGMENT) {
                for (let i = breakPoint; i > breakPoint - 100 && i > 0; i--) {
                    if (remainingText.charAt(i) === ' ') {
                        breakPoint = i + 1;
                        break;
                    }
                }
            }
            
            const segment = remainingText.substring(0, breakPoint);
            segments.push(segment);
            remainingText = remainingText.substring(breakPoint);
        }
        
        return segments;
    }
    
    // Funktion för att skapa filnamn
    function createFileName(text, index) {
        // Hämta första raden som rubrik
        const firstLine = text.split('\n')[0].trim();
        
        // Begränsa till 30 tecken för att undvika för långa filnamn
        const shortTitle = firstLine.substring(0, 30);
        
        // Skapa datumstämpel i YYmmdd-format
        const today = new Date();
        const year = today.getFullYear().toString().substring(2); // Tar bara de sista två siffrorna
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const dateStamp = `${year}${month}${day}`;
        
        // Lägg till index med ledande nollor 001, 002, etc.
        const segmentIndex = (index + 1).toString().padStart(3, '0');
        
        // Sätt ihop filnamnet: rubrik_datum_index
        let fileName = `${shortTitle}_${dateStamp}_${segmentIndex}.mp3`;
        
        // Ersätt tecken som inte är tillåtna i filnamn
        fileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
        
        return fileName;
    }
    
    // Skapa och hantera nedladdningsknappar för alla filer
    function setupDownloadButtons(audioBlobs, originalText) {
        // Töm tidigare innehåll
        const audioPlayerDiv = document.getElementById('audioPlayer');
        audioPlayerDiv.innerHTML = '';
        
        // Skapa en div för att innehålla alla nedladdningsknappar
        const downloadsContainer = document.createElement('div');
        downloadsContainer.className = 'downloads-container';
        
        // Lägg till en rubrik
        const heading = document.createElement('h3');
        heading.textContent = `Ljudfiler (${audioBlobs.length} st)`;
        downloadsContainer.appendChild(heading);
        
        // Skapa en knapp för varje ljudfil
        audioBlobs.forEach((blob, index) => {
            const audioWrapper = document.createElement('div');
            audioWrapper.className = 'audio-wrapper';
            
            // Skapa ljudspelare
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = URL.createObjectURL(blob);
            
            // Skapa nedladdningsknapp
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-segment-btn';
            const fileName = createFileName(originalText, index);
            downloadBtn.textContent = `Ladda ner del ${index + 1}`;
            downloadBtn.dataset.filename = fileName;
            
            downloadBtn.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
            
            // Lägg till i wrapper
            audioWrapper.appendChild(audio);
            audioWrapper.appendChild(downloadBtn);
            
            // Lägg till i container
            downloadsContainer.appendChild(audioWrapper);
        });
        
        // Lägg till en knapp för att ladda ner alla filer
        const downloadAllBtn = document.createElement('button');
        downloadAllBtn.id = 'downloadAllBtn';
        downloadAllBtn.textContent = 'Ladda ner alla filer';
        downloadAllBtn.addEventListener('click', () => {
            // Ladda ner alla filer i sekvens
            audioBlobs.forEach((blob, index) => {
                setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = createFileName(originalText, index);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }, index * 500); // 500ms mellan varje nedladdning för att undvika blockering
            });
        });
        
        // Lägg till i DOM
        downloadsContainer.appendChild(downloadAllBtn);
        audioPlayerDiv.appendChild(downloadsContainer);
        audioPlayerDiv.style.display = 'block';
    }
    
    // Konvertera ett textsegment till tal
    async function convertSegmentToSpeech(text, voice) {
        console.log(`Konverterar segment med ${text.length} tecken...`);
        
        const response = await fetch('/.netlify/functions/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                voice
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API svarade med status: ${response.status}. ${errorText}`);
        }
        
        return await response.blob();
    }
    
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
            loadingIndicator.style.display = 'block';
            
            // Dela upp texten i segment
            const segments = splitTextIntoSegments(text);
            console.log(`Texten delades upp i ${segments.length} segment`);
            
            // Uppdatera laddningsindikatorn
            const loadingText = document.querySelector('#loadingIndicator p');
            loadingText.textContent = `Konverterar text till tal (0/${segments.length})...`;
            
            // Konvertera varje segment och samla in resultaten
            audioBlobs = [];
            
            for (let i = 0; i < segments.length; i++) {
                loadingText.textContent = `Konverterar text till tal (${i+1}/${segments.length})...`;
                const blob = await convertSegmentToSpeech(segments[i], voiceSelect.value);
                audioBlobs.push(blob);
            }
            
            // Dölj laddningsindikatorn
            loadingIndicator.style.display = 'none';
            
            // Skapa nedladdningsknappar och ljudspelare
            setupDownloadButtons(audioBlobs, text);
            
            // Återställ knappen
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
            
            console.log('Konvertering slutförd!');
        } catch (error) {
            console.error('Ett fel inträffade:', error);
            
            // Dölj laddningsindikatorn vid fel
            loadingIndicator.style.display = 'none';
            
            alert(`Error: ${error.message}`);
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        }
    });
});
