document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const convertBtn = document.getElementById('convertBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const fileUpload = document.getElementById('fileUpload');
    const uploadStatus = document.getElementById('upload-status');
    const charCount = document.getElementById('charCount');
    const costEstimate = document.getElementById('costEstimate');
    const segmentCount = document.getElementById('segmentCount');
    
    // Constants
    const MAX_SEGMENT_LENGTH = 4090;
    const COST_PER_CHAR = 0.000015; // Approximate cost in SEK
    
    // Listen for text changes
    textInput.addEventListener('input', updateTextStats);
    
    // File upload handler
    fileUpload.addEventListener('change', handleFileUpload);
    
    // Update text statistics
    function updateTextStats() {
        const text = textInput.value;
        const length = text.length;
        
        // Update character count
        charCount.textContent = length;
        
        // Calculate estimated cost (SEK)
        const cost = (length * COST_PER_CHAR).toFixed(2);
        costEstimate.textContent = cost;
        
        // Calculate number of segments needed
        const segments = Math.ceil(length / MAX_SEGMENT_LENGTH);
        segmentCount.textContent = segments;
    }
    
    // Handle file uploads
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        uploadStatus.style.display = 'block';
        uploadStatus.textContent = `Läser in: ${file.name}`;
        
        try {
            let text = '';
            
            // Handle different file types
            if (file.type === 'application/pdf') {
                text = await extractTextFromPDF(file);
            } else if (file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/html') {
                text = await readTextFile(file);
            } else if (file.type === 'text/csv') {
                text = await readTextFile(file);
            } else if (file.type.includes('word')) {
                uploadStatus.textContent = 'Word-dokument stöds inte direkt. Kopiera texten manuellt.';
                return;
            } else {
                uploadStatus.textContent = 'Filformatet stöds inte.';
                return;
            }
            
            textInput.value = text;
            updateTextStats();
            uploadStatus.textContent = `${file.name} har lästs in.`;
            
        } catch (error) {
            uploadStatus.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        }
    }
    
    // Read text from file
    function readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Kunde inte läsa filen'));
            reader.readAsText(file);
        });
    }
    
    // Extract text from PDF
    async function extractTextFromPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                text += strings.join(' ') + '\n';
            }
            
            return text;
        } catch (error) {
            throw new Error('Kunde inte läsa PDF: ' + error.message);
        }
    }
    
    // Split text into segments
    function splitTextIntoSegments(text, maxLength) {
        const segments = [];
        let remainingText = text;
        
        while (remainingText.length > 0) {
            let segment;
            if (remainingText.length <= maxLength) {
                segment = remainingText;
                remainingText = '';
            } else {
                // Find a good breakpoint (sentence or paragraph)
                let breakPoint = remainingText.lastIndexOf('.', maxLength);
                if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
                    breakPoint = remainingText.lastIndexOf(' ', maxLength);
                }
                if (breakPoint === -1) breakPoint = maxLength;
                
                segment = remainingText.substring(0, breakPoint + 1);
                remainingText = remainingText.substring(breakPoint + 1);
            }
            segments.push(segment.trim());
        }
        
        return segments;
    }
    
    // Convert text to speech
    convertBtn.addEventListener('click', async () => {
        const fullText = textInput.value.trim();
        if (!fullText) {
            alert('Vänligen skriv in text först');
            return;
        }
        
        // Prepare UI
        convertBtn.disabled = true;
        convertBtn.textContent = 'Konverterar...';
        loadingIndicator.style.display = 'block';
        audioPlayer.innerHTML = ''; // Clear previous audio elements
        
        try {
            // Split text into segments if needed
            const segments = splitTextIntoSegments(fullText, MAX_SEGMENT_LENGTH);
            
            // Create container for all audio files if multiple segments
            if (segments.length > 1) {
                const downloadAllBtn = document.createElement('button');
                downloadAllBtn.id = 'downloadAllBtn';
                downloadAllBtn.textContent = 'Ladda ner alla ljudfiler (ZIP)';
                downloadAllBtn.style.display = 'none'; // Hide until all conversions complete
                audioPlayer.appendChild(downloadAllBtn);
            }
            
            // Process each segment
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                
                // Create wrapper for this segment
                const wrapper = document.createElement('div');
                wrapper.className = 'audio-wrapper';
                
                // Add segment info if there are multiple
                if (segments.length > 1) {
                    const segmentInfo = document.createElement('p');
                    segmentInfo.textContent = `Del ${i+1} av ${segments.length}`;
                    wrapper.appendChild(segmentInfo);
                }
                
                // Create audio element
                const audio = document.createElement('audio');
                audio.controls = true;
                wrapper.appendChild(audio);
                
                // Create download button for this segment
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-segment-btn';
                downloadBtn.textContent = 'Ladda ner ljudfil';
                downloadBtn.disabled = true; // Disabled until conversion completes
                wrapper.appendChild(downloadBtn);
                
                audioPlayer.appendChild(wrapper);
                
                // Start conversion for this segment
                try {
                    const response = await fetch('/.netlify/functions/text-to-speech', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            text: segment,
                            voice: voiceSelect.value
                        })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`API svarade med status: ${response.status}. ${errorText}`);
                    }
                    
                    // Handle response
                    const audioBlob = await response.blob();
                    
                    // Create URL for audio playback
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audio.src = audioUrl;
                    
                    // Enable download button
                    downloadBtn.disabled = false;
                    
                    // Set up download handler
                    downloadBtn.addEventListener('click', () => {
                        const a = document.createElement('a');
                        a.href = audioUrl;
                        a.download = segments.length > 1 
                            ? `text-till-tal-del-${i+1}.mp3` 
                            : 'text-till-tal.mp3';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    });
                    
                } catch (error) {
                    const errorMsg = document.createElement('p');
                    errorMsg.className = 'error';
                    errorMsg.textContent = `Fel vid konvertering av del ${i+1}: ${error.message}`;
                    wrapper.appendChild(errorMsg);
                }
            }
            
            // Show audio player section
            audioPlayer.style.display = 'block';
            
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            // Reset UI
            loadingIndicator.style.display = 'none';
            convertBtn.disabled = false;
            convertBtn.textContent = 'Konvertera till tal';
        }
    });
    
    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
});
