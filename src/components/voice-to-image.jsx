import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../App.css';

const VoiceToImage = () => {
  const [currentMode, setCurrentMode] = useState('single'); // 'single', 'saga', or 'video'
  const [imageSets, setImageSets] = useState([{id: 0, images: [null, null, null], prompt: '', language: 'en-IN'}]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [savedImages, setSavedImages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [speechTimeout, setSpeechTimeout] = useState(null);

  // Saga mode specific states
  const [sagaStory, setSagaStory] = useState([]);
  const [sagaImages, setSagaImages] = useState([]);
  const [currentSagaScene, setCurrentSagaScene] = useState(0);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [isPlayingStory, setIsPlayingStory] = useState(false);
  const [sagaProjects, setSagaProjects] = useState([]);

  // Video mode specific states
  const [videoPrompts, setVideoPrompts] = useState([]);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [videoProjects, setVideoProjects] = useState([]);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0);

  const [pauseDetectionTimeout, setPauseDetectionTimeout] = useState(null);
  const [stopRecordingTimeout, setStopRecordingTimeout] = useState(null);
  const [showAddSceneModal, setShowAddSceneModal] = useState(false);
  const [newSceneText, setNewSceneText] = useState('');
  const [isAddingVoiceScene, setIsAddingVoiceScene] = useState(false);

  // Enhanced editing states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(null); // 'voice' or 'text'
  const [voiceEditMode, setVoiceEditMode] = useState(null); // 'continue' or 'restart'
  const [showProjectTitleModal, setShowProjectTitleModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [showYourDesigns, setShowYourDesigns] = useState(false);

  const { transcript, finalTranscript: speechFinalTranscript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({
    transcribing: true,
    clearTranscriptOnListen: false,
    continuous: true,
    interimResults: true
  });

  const currentSet = imageSets[currentSetIndex];
  const CLIPDROP_API_KEY = 'b3f450cf5acf07b6b43c7a76e06bca0353c42b78d1c7a20eef09d9c6ed4e4faa14e8903368f05846ba2e3eacc18533fa';
  const RUNWAY_ML_API_KEY = 'key_96be78cd056f7123b3c17dd041dc4059945de770582f895752db13da4d29f61d580c8f5137a666f6cb84e2b237a492b0a1eae4665bdf27c49be44737a954d801';

  useEffect(() => {
    // Auto-detect language based on browser settings
    const browserLang = navigator.language || 'en-US';
    if (browserLang.startsWith('te')) {
      setLanguage('te-IN'); // Telugu
    } else if (browserLang.startsWith('hi')) {
      setLanguage('hi-IN'); // Hindi
    } else {
      setLanguage('en-IN'); // Default to English
    }

    // Load saved projects from localStorage
    const savedSagaProjects = localStorage.getItem('sagaProjects');
    if (savedSagaProjects) {
      try {
        setSagaProjects(JSON.parse(savedSagaProjects));
      } catch (error) {
        console.error('Error loading saga projects:', error);
      }
    }
  }, []);

  // Enhanced pause detection for saga and video modes with improved timing
  useEffect(() => {
    if (isListening && (currentMode === 'saga' || currentMode === 'video')) {
      // Clear previous timeouts
      if (pauseDetectionTimeout) {
        clearTimeout(pauseDetectionTimeout);
      }
      if (stopRecordingTimeout) {
        clearTimeout(stopRecordingTimeout);
      }

      if (transcript && transcript.trim()) {
        // 2-second pause detection for scene cutting (Scene 2, 3, etc.)
        const pauseTimeout = setTimeout(() => {
          if (transcript.trim()) {
            const currentPrompt = transcript.trim();
            if (currentMode === 'saga') {
              console.log(`Scene cut after 2-second pause - Adding Scene ${sagaStory.length + 1}:`, currentPrompt);
              setSagaStory(prev => {
                // Avoid duplicates by checking last scene
                if (prev.length === 0 || prev[prev.length - 1].trim() !== currentPrompt.trim()) {
                  return [...prev, currentPrompt];
                }
                return prev;
              });
            } else if (currentMode === 'video') {
              console.log(`Video prompt cut after 2-second pause - Adding Prompt ${videoPrompts.length + 1}:`, currentPrompt);
              setVideoPrompts(prev => {
                // Avoid duplicates by checking last prompt
                if (prev.length === 0 || prev[prev.length - 1].trim() !== currentPrompt.trim()) {
                  return [...prev, currentPrompt];
                }
                return prev;
              });
            }
            resetTranscript();
          }
        }, 2000);

        // 5-second pause detection for stopping recording completely
        const stopTimeout = setTimeout(() => {
          if (transcript.trim()) {
            const currentPrompt = transcript.trim();
            if (currentMode === 'saga') {
              console.log('Final scene before stopping recording:', currentPrompt);
              setSagaStory(prev => {
                // Add final scene if different
                if (prev.length === 0 || prev[prev.length - 1].trim() !== currentPrompt.trim()) {
                  return [...prev, currentPrompt];
                }
                return prev;
              });
              console.log('Recording stopped after 5-second pause - Total scenes:', sagaStory.length + 1);
            } else if (currentMode === 'video') {
              console.log('Final video prompt before stopping recording:', currentPrompt);
              setVideoPrompts(prev => {
                // Add final prompt if different
                if (prev.length === 0 || prev[prev.length - 1].trim() !== currentPrompt.trim()) {
                  return [...prev, currentPrompt];
                }
                return prev;
              });
              console.log('Recording stopped after 5-second pause - Total prompts:', videoPrompts.length + 1);
            }
            resetTranscript();
          }
          stopListening();
        }, 5000);

        setPauseDetectionTimeout(pauseTimeout);
        setStopRecordingTimeout(stopTimeout);
      }
    } else if (transcript && isListening && currentMode === 'single') {
      // Enhanced single mode logic with better speech completion detection
      if (speechTimeout) {
        clearTimeout(speechTimeout);
      }

      const timeout = setTimeout(() => {
        if (transcript.trim()) {
          console.log('Single mode - Final transcript captured:', transcript.trim());
          setFinalTranscript(transcript.trim());
        }
      }, 1500); // Reduced to 1.5 seconds for better responsiveness

      setSpeechTimeout(timeout);
    }

    return () => {
      if (pauseDetectionTimeout) {
        clearTimeout(pauseDetectionTimeout);
      }
      if (stopRecordingTimeout) {
        clearTimeout(stopRecordingTimeout);
      }
      if (speechTimeout) {
        clearTimeout(speechTimeout);
      }
    };
  }, [transcript, isListening, currentMode, sagaStory.length]);

  // Handle final transcript from speech recognition
  useEffect(() => {
    if (speechFinalTranscript && speechFinalTranscript.trim() && currentMode === 'single') {
      setFinalTranscript(speechFinalTranscript.trim());
    }
    // For saga mode, we handle transcripts through the pause detection logic only
  }, [speechFinalTranscript, currentMode]);



  const addNewScene = (sceneText) => {
    if (sceneText.trim()) {
      setSagaStory(prev => [...prev, sceneText.trim()]);
      setNewSceneText('');
      setShowAddSceneModal(false);
      setIsAddingVoiceScene(false);
    }
  };

  const startVoiceSceneRecording = () => {
    setIsAddingVoiceScene(true);
    setNewSceneText('');
    resetTranscript();

    const speechConfig = {
      continuous: true,
      language: language,
      interimResults: true,
      maxAlternatives: 3
    };

    console.log(`Starting voice scene recording with language: ${language}`);
    SpeechRecognition.startListening(speechConfig);
  };

  const stopVoiceSceneRecording = () => {
    SpeechRecognition.stopListening();
    setIsAddingVoiceScene(false);
    if (transcript.trim()) {
      addNewScene(transcript.trim());
      resetTranscript();
    }
  };

  const translateToEnglish = async (text, sourceLang) => {
    if (sourceLang === 'en-IN' || sourceLang === 'en-US') {
      return text; // Already in English
    }

    // Enhanced text cleaning for better translation
    const cleanText = text.trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0900-\u097F\u0C00-\u0C7F]/g, '') // Keep only alphanumeric, Telugu, Hindi chars
      .trim();

    if (!cleanText || cleanText.length < 2) {
      return text;
    }

    try {
      // Enhanced translation with multiple services and retry logic
      const translationServices = [
        // Google Translate API (via unofficial endpoint)
        async () => {
          const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang.split('-')[0]}&tl=en&dt=t&q=${encodeURIComponent(cleanText)}`);
          const result = await response.json();
          return result[0]?.[0]?.[0] || null;
        },

        // MyMemory API with enhanced parameters
        async () => {
          const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${sourceLang.split('-')[0]}|en&de=your-email@example.com`);
          const data = await response.json();
          if (data.responseStatus === 200 && data.responseData.match > 0.7) {
            return data.responseData.translatedText;
          }
          return null;
        },

        // LibreTranslate with error handling
        async () => {
          const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            body: JSON.stringify({
              q: cleanText,
              source: sourceLang.split('-')[0] === 'te' ? 'te' : 'hi',
              target: 'en',
              format: 'text'
            }),
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          return data.translatedText || null;
        }
      ];

      // Try each service with timeout
      for (const service of translationServices) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Translation timeout')), 5000)
          );

          const result = await Promise.race([service(), timeoutPromise]);

          if (result && result.trim() && result.trim() !== cleanText) {
            const translated = result.trim();
            console.log(`Translation successful - Original (${sourceLang}): "${cleanText}" → "${translated}"`);
            return translated;
          }
        } catch (serviceError) {
          console.warn('Translation service failed:', serviceError.message);
          continue;
        }
      }

      console.warn('All translation services failed, using original text');
      return text;
    } catch (error) {
      console.warn('Translation error:', error);
      return text;
    }
  };

  const generateImages = async (prompt, isRegeneration = false, selectedIdx = null) => {
    if (!prompt) {
      setError('Please provide a description to generate images.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Translate prompt to English if it's in another language
    const englishPrompt = await translateToEnglish(prompt, language);
    console.log(`Original: ${prompt}, Translated: ${englishPrompt}`);

    const form = new FormData();
    form.append('prompt', englishPrompt);

    try {
      const responses = await Promise.all([
        fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        }),
        fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        }),
        fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        }),
      ]);

      if (!responses.every(response => response.ok)) {
        throw new Error('Failed to generate images. Check your API key or credits.');
      }

      const buffers = await Promise.all(responses.map(response => response.arrayBuffer()));
      const newImageUrls = buffers.map(buffer => URL.createObjectURL(new Blob([buffer], { type: 'image/png' })));

      if (isRegeneration && selectedIdx !== null) {
        // Create a new set for regeneration
        const newSet = {
          id: imageSets.length,
          images: [...currentSet.images],
          prompt: `${currentSet.prompt} → ${prompt}`,
          language,
          originalPrompt: prompt,
          translatedPrompt: englishPrompt
        };
        newSet.images[selectedIdx] = newImageUrls[0];

        setImageSets([...imageSets, newSet]);
        setCurrentSetIndex(imageSets.length);
      } else {
        // Create a new set for initial generation
        const newSet = {
          id: imageSets.length,
          images: newImageUrls,
          prompt: prompt,
          language,
          originalPrompt: prompt,
          translatedPrompt: englishPrompt
        };

        setImageSets([...imageSets, newSet]);
        setCurrentSetIndex(imageSets.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSagaImages = async () => {
    if (sagaStory.length === 0) {
      setError('Please record a story first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSagaImages([]);

    try {
      const imagePromises = sagaStory.map(async (scene, index) => {
        const englishPrompt = await translateToEnglish(scene, language);

        const form = new FormData();
        form.append('prompt', englishPrompt);

        const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        });

        if (!response.ok) {
          throw new Error(`Failed to generate image for scene ${index + 1}`);
        }

        const buffer = await response.arrayBuffer();
        const imageUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));

        return {
          id: index,
          image: imageUrl,
          prompt: scene,
          translatedPrompt: englishPrompt
        };
      });

      const generatedImages = await Promise.all(imagePromises);
      setSagaImages(generatedImages);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateVideosFromPrompts = async () => {
    if (videoPrompts.length === 0) {
      setError('Please record video prompts first.');
      return;
    }

    console.log('Starting video generation with API key:', RUNWAY_ML_API_KEY ? 'Set' : 'Not set');
    console.log('Video prompts to process:', videoPrompts);

    if (!RUNWAY_ML_API_KEY || RUNWAY_ML_API_KEY === 'your-runway-ml-api-key-here') {
      setError('Please set your Runway ML API key. Go to Runway ML, get your API key, and update the RUNWAY_ML_API_KEY variable.');
      return;
    }

    setIsGeneratingVideos(true);
    setError(null);
    setGeneratedVideos([]);
    setVideoGenerationProgress(0);

    try {
      const totalVideos = videoPrompts.length * 3; // 3 videos per prompt
      let completedVideos = 0;

      // Process prompts sequentially to avoid rate limits
      for (let promptIndex = 0; promptIndex < videoPrompts.length; promptIndex++) {
        const prompt = videoPrompts[promptIndex];
        const englishPrompt = await translateToEnglish(prompt, language);

        console.log(`Processing prompt ${promptIndex + 1}: "${englishPrompt}"`);

        // Generate 3 videos for each prompt
        for (let videoNumber = 1; videoNumber <= 3; videoNumber++) {
          try {
            console.log(`Generating video ${videoNumber} for prompt: ${englishPrompt}`);

            // Runway ML Gen-3 API call - using correct endpoint
            const response = await fetch('https://api.runwayml.com/v1/image_to_video', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RUNWAY_ML_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Runway-Version': '2024-09-13'
              },
              body: JSON.stringify({
                model: 'gen3a_turbo',
                prompt_text: englishPrompt,
                duration: 5,
                aspect_ratio: '1280:768',
                seed: Math.floor(Math.random() * 1000000)
              }),
            });

            console.log(`API Response status: ${response.status}`);
            console.log(`API Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
              let errorText;
              try {
                errorText = await response.text();
                console.error(`API Error Response: ${errorText}`);
              } catch (e) {
                errorText = 'Unable to read error response';
              }

              // Handle specific error cases
              if (response.status === 401) {
                throw new Error('Invalid API key. Please check your Runway ML API key.');
              } else if (response.status === 404) {
                throw new Error('API endpoint not found. Please check if you have access to Runway ML Gen-3 API.');
              } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait and try again.');
              } else if (response.status === 402) {
                throw new Error('Insufficient credits. Please add credits to your Runway ML account.');
              } else if (response.status === 400) {
                throw new Error(`Bad request: ${errorText}. Please check your prompt and parameters.`);
              } else {
                throw new Error(`API Error: ${response.status} - ${errorText}`);
              }
            }

            const data = await response.json();
            console.log('API Response data:', data);

            // Check if the response contains a direct video URL or task ID
            if (data.url || data.video_url || data.output) {
              // Direct video URL response
              completedVideos++;
              setVideoGenerationProgress((completedVideos / totalVideos) * 100);

              const newVideo = {
                id: `${promptIndex}-${videoNumber}`,
                promptIndex,
                videoNumber,
                videoUrl: data.url || data.video_url || data.output,
                prompt: prompt,
                translatedPrompt: englishPrompt,
                status: 'completed'
              };

              setGeneratedVideos(prev => [...prev, newVideo]);
              console.log('Video completed successfully:', newVideo);

            } else if (data.id || data.task_id) {
              // Task-based response - need to poll for completion
              const taskId = data.id || data.task_id;
              let videoReady = false;
              let attempts = 0;
              const maxAttempts = 60; // 5 minutes maximum wait time

              while (!videoReady && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

                try {
                  const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
                    headers: {
                      'Authorization': `Bearer ${RUNWAY_ML_API_KEY}`,
                      'Content-Type': 'application/json',
                      'X-Runway-Version': '2024-09-13'
                    },
                  });

                  if (!statusResponse.ok) {
                    console.error(`Status check failed: ${statusResponse.status}`);
                    attempts++;
                    continue;
                  }

                  const statusData = await statusResponse.json();
                  console.log(`Video ${videoNumber} status:`, statusData.status || statusData.state);

                  if (statusData.status === 'SUCCEEDED' || statusData.state === 'completed' || statusData.url) {
                    videoReady = true;
                    completedVideos++;
                    setVideoGenerationProgress((completedVideos / totalVideos) * 100);

                    const newVideo = {
                      id: `${promptIndex}-${videoNumber}`,
                      promptIndex,
                      videoNumber,
                      videoUrl: statusData.url || statusData.output?.[0] || statusData.output,
                      prompt: prompt,
                      translatedPrompt: englishPrompt,
                      status: 'completed'
                    };

                    setGeneratedVideos(prev => [...prev, newVideo]);
                    console.log('Video completed successfully:', newVideo);

                  } else if (statusData.status === 'FAILED' || statusData.state === 'failed') {
                    throw new Error(`Video generation failed: ${statusData.failure_reason || statusData.error || 'Unknown error'}`);
                  } else {
                    console.log(`Video ${videoNumber} still processing... (attempt ${attempts + 1})`);
                  }

                  attempts++;
                } catch (pollError) {
                  console.error(`Error polling status for video ${videoNumber}:`, pollError);
                  attempts++;
                  // Prevent unhandled promise rejection
                  if (attempts >= maxAttempts) {
                    throw new Error(`Failed to check video status: ${pollError.message || 'Unknown error'}`);
                  }
                }
              }

              if (!videoReady) {
                throw new Error(`Video generation timed out for prompt ${promptIndex + 1}, video ${videoNumber}`);
              }
            } else {
              throw new Error('Unexpected API response format');
            }

          } catch (error) {
            console.error(`Error generating video ${videoNumber} for prompt ${promptIndex + 1}:`, error);
            completedVideos++;
            setVideoGenerationProgress((completedVideos / totalVideos) * 100);

            const failedVideo = {
              id: `${promptIndex}-${videoNumber}`,
              promptIndex,
              videoNumber,
              videoUrl: null,
              prompt: prompt,
              translatedPrompt: englishPrompt,
              status: 'failed',
              error: error.message || 'Video generation failed'
            };

            setGeneratedVideos(prev => [...prev, failedVideo]);

            // Continue with next video instead of stopping everything
            continue;
          }
        }
      }

      console.log('Video generation process completed');

    } catch (err) {
      console.error('Video generation error:', err);
      setError(`Video generation failed: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setIsGeneratingVideos(false);
      setVideoGenerationProgress(0);
    }
  };

  const handleGenerate = () => {
    if (currentMode === 'saga') {
      if (sagaStory.length === 0) {
        alert('Please record a story first by speaking into the microphone.');
        return;
      }
      generateSagaImages();
    } else if (currentMode === 'video') {
      if (videoPrompts.length === 0) {
        alert('Please record video prompts first by speaking into the microphone.');
        return;
      }
      generateVideosFromPrompts();
    } else {
      const textToUse = finalTranscript || transcript;

      if (!textToUse || !textToUse.trim()) {
        alert('Please provide a prompt by speaking. Speak clearly and wait for the complete sentence to be captured.');
        return;
      }

      if (selectedImageIndex !== null) {
        generateImages(textToUse.trim(), true, selectedImageIndex);
      } else {
        generateImages(textToUse.trim());
      }
    }

    SpeechRecognition.stopListening();
    setIsListening(false);
    resetTranscript();
    setFinalTranscript('');
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }
  };

  const startListening = () => {
    resetTranscript();

    // Enhanced speech recognition configuration for better accuracy
    const speechConfig = {
      continuous: true,
      language: language,
      interimResults: true,
      maxAlternatives: 3, // Get multiple recognition alternatives
      grammars: undefined // Let browser use default grammar for better accuracy
    };

    console.log(`Starting speech recognition with language: ${language}`);
    SpeechRecognition.startListening(speechConfig);
    setIsListening(true);
    setFinalTranscript('');

    // Clear any existing timeouts
    if (pauseDetectionTimeout) clearTimeout(pauseDetectionTimeout);
    if (stopRecordingTimeout) clearTimeout(stopRecordingTimeout);
    if (speechTimeout) clearTimeout(speechTimeout);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);

    // Capture any remaining transcript as final for saga and video modes only if it's different
    if (transcript && transcript.trim() && currentMode === 'saga') {
      const currentScene = transcript.trim();
      setSagaStory(prev => {
        // Only add if it's different from the last scene
        if (prev.length === 0 || prev[prev.length - 1] !== currentScene) {
          return [...prev, currentScene];
        }
        return prev;
      });
      resetTranscript();
    } else if (transcript && transcript.trim() && currentMode === 'video') {
      const currentPrompt = transcript.trim();
      setVideoPrompts(prev => {
        // Only add if it's different from the last prompt
        if (prev.length === 0 || prev[prev.length - 1] !== currentPrompt) {
          return [...prev, currentPrompt];
        }
        return prev;
      });
      resetTranscript();
    } else if (transcript && transcript.trim() && currentMode === 'single') {
      setFinalTranscript(transcript.trim());
    }

    // Clear all timeouts
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }
    if (pauseDetectionTimeout) {
      clearTimeout(pauseDetectionTimeout);
    }
    if (stopRecordingTimeout) {
      clearTimeout(stopRecordingTimeout);
    }
  };

  const saveSagaProject = () => {
    if (sagaStory.length === 0 || sagaImages.length === 0) {
      alert('Please generate a complete saga first.');
      return;
    }
    setShowProjectTitleModal(true);
  };

  const confirmSaveProject = async () => {
    if (!projectTitle.trim()) {
      alert('Please enter a project title.');
      return;
    }

    const project = {
      id: Date.now(),
      name: projectTitle.trim(),
      story: sagaStory,
      images: sagaImages,
      createdAt: new Date().toLocaleDateString(),
      createdTime: new Date().toLocaleTimeString()
    };

    const updatedProjects = [...sagaProjects, project];
    setSagaProjects(updatedProjects);
    
    // Save to localStorage
    localStorage.setItem('sagaProjects', JSON.stringify(updatedProjects));

    // Generate PDF
    await generateProjectPDF(project);

    setShowProjectTitleModal(false);
    setProjectTitle('');
    alert('Saga project saved successfully!');
  };

  const generateProjectPDF = async (project) => {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${project.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: #f8f9fa;
            }
            .pdf-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              border: 2px solid #4361ee;
            }
            .pdf-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #4361ee;
            }
            .pdf-title {
              font-size: 2.5rem;
              color: #4361ee;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .pdf-subtitle {
              color: #666;
              font-size: 1.2rem;
            }
            .scene-container {
              margin: 30px 0;
              padding: 20px;
              border: 2px solid #e9ecef;
              border-radius: 12px;
              background: #f8f9fa;
            }
            .scene-number {
              font-size: 1.5rem;
              color: #4361ee;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .scene-image {
              width: 100%;
              max-width: 400px;
              height: 300px;
              object-fit: cover;
              border-radius: 10px;
              margin: 15px auto;
              display: block;
              border: 3px solid #4361ee;
            }
            .scene-text {
              font-size: 1.1rem;
              line-height: 1.6;
              color: #333;
              margin-top: 15px;
              padding: 15px;
              background: white;
              border-radius: 8px;
              border-left: 4px solid #4cc9f0;
            }
            .pdf-footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #4361ee;
              color: #666;
            }
            @media print {
              body { margin: 0; background: white; }
              .pdf-container { box-shadow: none; border: none; }
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="pdf-header">
              <div class="pdf-title">${project.name}</div>
              <div class="pdf-subtitle">SoundPix Story Project</div>
              <div class="pdf-subtitle">Created: ${project.createdAt} at ${project.createdTime}</div>
            </div>
      `;

      project.images.forEach((sceneData, index) => {
        htmlContent += `
          <div class="scene-container">
            <div class="scene-number">Scene ${index + 1}</div>
            <img src="${sceneData.image}" alt="Scene ${index + 1}" class="scene-image" />
            <div class="scene-text">${sceneData.prompt}</div>
          </div>
        `;
      });

      htmlContent += `
            <div class="pdf-footer">
              <p>Generated by SoundPix - Voice to Story Platform</p>
              <p>Total Scenes: ${project.images.length}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Auto-trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 1000);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const saveVideoProject = () => {
    if (videoPrompts.length === 0 || generatedVideos.length === 0) {
      alert('Please generate videos first.');
      return;
    }

    const project = {
      id: Date.now(),
      name: `Video Project ${videoProjects.length + 1}`,
      prompts: videoPrompts,
      videos: generatedVideos,
      createdAt: new Date().toLocaleDateString()
    };

    setVideoProjects([...videoProjects, project]);
    alert('Video project saved successfully!');
  };

  const playStory = () => {
    if (sagaStory.length === 0) {
      alert('No story to play. Please record a story first.');
      return;
    }

    setIsPlayingStory(true);
    setCurrentSagaScene(0);

    // Enhanced story play with voice synthesis and scrolling
    let sceneIndex = 0;
    
    const playScene = (index) => {
      if (index >= sagaStory.length) {
        setIsPlayingStory(false);
        setCurrentSagaScene(0);
        return;
      }

      setCurrentSagaScene(index);
      
      // Scroll to the current scene
      const sceneElement = document.getElementById(`scene-${index}`);
      if (sceneElement) {
        sceneElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }

      // Use Web Speech API to read the scene text
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(sagaStory[index]);
        
        // Configure voice settings based on current language
        if (language === 'hi-IN') {
          utterance.lang = 'hi-IN';
        } else if (language === 'te-IN') {
          utterance.lang = 'te-IN';
        } else {
          utterance.lang = 'en-US';
        }
        
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;

        // When speech ends, move to next scene
        utterance.onend = () => {
          setTimeout(() => {
            playScene(index + 1);
          }, 1000); // 1 second pause between scenes
        };

        // Handle speech errors
        utterance.onerror = () => {
          console.warn('Speech synthesis error, continuing to next scene');
          setTimeout(() => {
            playScene(index + 1);
          }, 3000); // Fallback to 3 second delay
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback for browsers without speech synthesis
        setTimeout(() => {
          playScene(index + 1);
        }, 3000);
      }
    };

    playScene(0);
  };

  const downloadImage = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveImage = (url) => {
    if (!savedImages.includes(url)) {
      setSavedImages([...savedImages, url]);
    }
  };

  const exportSagaData = () => {
    if (sagaStory.length === 0 && sagaImages.length === 0) {
      alert('No saga data to export.');
      return;
    }

    const exportData = {
      story: sagaStory,
      images: sagaImages.map(img => ({ ...img, image: 'blob_url_placeholder' })),
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `saga_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(currentSetIndex - 1);
    }
  };

  const goForward = () => {
    if (currentSetIndex < imageSets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  };

  const deleteHistoryItem = (id) => {
    if (imageSets.length <= 1) return;

    const newSets = imageSets.filter(set => set.id !== id);
    setImageSets(newSets);

    if (currentSetIndex >= newSets.length) {
      setCurrentSetIndex(newSets.length - 1);
    }
  };

  const toggleLanguage = () => {
    const languages = ['en-IN', 'hi-IN', 'te-IN'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  const updateStoryLine = (index, newText) => {
    const updatedStory = [...sagaStory];
    updatedStory[index] = newText;
    setSagaStory(updatedStory);
  };

  const handleEditStory = () => {
    setShowEditModal(true);
  };

  const startVoiceEdit = (mode) => {
    setVoiceEditMode(mode);
    setEditMode('voice');
    setShowEditModal(false);
    
    if (mode === 'restart') {
      setSagaStory([]);
      setSagaImages([]);
    }
    
    resetTranscript();
    startListening();
  };

  const startTextEdit = () => {
    setEditMode('text');
    setShowEditModal(false);
    setIsEditingStory(true);
  };

  const handleYourDesigns = () => {
    setShowYourDesigns(true);
  };

  const closeYourDesigns = () => {
    setShowYourDesigns(false);
  };

  const deleteProject = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      const updatedProjects = sagaProjects.filter(project => project.id !== projectId);
      setSagaProjects(updatedProjects);
      localStorage.setItem('sagaProjects', JSON.stringify(updatedProjects));
    }
  };

  const loadProject = (project) => {
    setSagaStory(project.story);
    setSagaImages(project.images);
    setShowYourDesigns(false);
    alert(`Project "${project.name}" loaded successfully!`);
  };

  if (!browserSupportsSpeechRecognition) {
    return <div className="error">Your browser does not support speech recognition.</div>;
  }

  return (
    <div className="App bright-theme">
      {/* Header Navigation */}
      <header className="header-nav">
        <div className="nav-left">
          <div className="brand-logo" onClick={() => window.location.reload()}>
            <i className="fas fa-volume-up"></i>
            <span>SoundPix</span>
          </div>
          <button 
            className={`nav-button ${currentMode === 'saga' ? 'active' : ''}`}
            onClick={() => setCurrentMode('saga')}
          >
            <i className="fas fa-book"></i> Voice to Saga Mode
          </button>
          <button 
            className={`nav-button ${currentMode === 'single' ? 'active' : ''}`}
            onClick={() => setCurrentMode('single')}
          >
            <i className="fas fa-image"></i> Voice to Image Mode
          </button>
          <button className="nav-button" onClick={handleYourDesigns}>
            <i className="fas fa-palette"></i> Your Designs
          </button>
        </div>
        <div className="nav-right">
          <button className="nav-button export-btn" onClick={exportSagaData}>
            <i className="fas fa-download"></i> Export
          </button>
        </div>
      </header>

      <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? 'Hide History' : 'Show History'}
      </button>

      <div className={`history-sidebar ${showHistory ? 'open' : ''}`}>
        <h3>{currentMode === 'saga' ? 'Saga Projects' : currentMode === 'video' ? 'Video Projects' : 'Generation History'}</h3>
        <ul>
          {currentMode === 'saga' ? (
            sagaProjects.map((project, idx) => (
              <li key={project.id}>
                <button onClick={() => {
                  setSagaStory(project.story);
                  setSagaImages(project.images);
                }}>
                  {project.name}
                  <span className="date-tag">{project.createdAt}</span>
                </button>
              </li>
            ))
          ) : currentMode === 'video' ? (
            videoProjects.map((project, idx) => (
              <li key={project.id}>
                <button onClick={() => {
                  setVideoPrompts(project.prompts);
                  setGeneratedVideos(project.videos);
                }}>
                  {project.name}
                  <span className="date-tag">{project.createdAt}</span>
                </button>
              </li>
            ))
          ) : (
            imageSets.map((set, idx) => (
              <li key={set.id} className={currentSetIndex === idx ? 'active' : ''}>
                <button onClick={() => setCurrentSetIndex(idx)}>
                  {set.prompt.substring(0, 30)}{set.prompt.length > 30 ? '...' : ''}
                  <span className="lang-tag">{set.language}</span>
                </button>
                <button className="delete-history" onClick={(e) => {
                  e.stopPropagation();
                  deleteHistoryItem(set.id);
                }}>×</button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="main-content">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome to Sound Pix</h1>
          <p className="welcome-subtitle">✨ Just Say It... We'll Show It.</p>
          <p className="welcome-question">What do you want to see today?</p>

          <div className="mode-selector">
            <label className="mode-option">
              <input 
                type="radio" 
                name="mode" 
                value="single" 
                checked={currentMode === 'single'}
                onChange={() => setCurrentMode('single')}
              />
              <span className="radio-custom"></span>
              Voice to Image
            </label>
            <label className="mode-option">
              <input 
                type="radio" 
                name="mode" 
                value="saga" 
                checked={currentMode === 'saga'}
                onChange={() => setCurrentMode('saga')}
              />
              <span className="radio-custom"></span>
              Voice to Scene
            </label>
          </div>

          <p className="export-text">*Export Visual Arts</p>
        </div>

        <div className="language-toggle">
          <button onClick={toggleLanguage}>
            <i className="fas fa-globe"></i> Switch Language: 
            {language === 'en-IN' ? ' English' : 
             language === 'hi-IN' ? ' हिंदी' : 
             language === 'te-IN' ? ' తెలుగు' : 'English'}
          </button>
        </div>

        {currentMode === 'saga' ? (
          // Saga Mode UI
          <div className="saga-mode">
            {/* Add Scene Button */}
            <button 
              className="add-scene-button"
              onClick={() => setShowAddSceneModal(true)}
              title="Add New Scene"
            >
              <i className="fas fa-plus"></i>
            </button>

            <div className="voice-container">
              <div className={`voice-animation ${isListening ? 'active' : ''}`}>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="mic-icon">
                  <i className="fas fa-microphone"></i>
                </div>
              </div>

              <div className="transcript-box">
                <div className="current-language-indicator">
                  <i className="fas fa-globe"></i> 
                  {language === 'en-IN' ? 'English' : 
                   language === 'hi-IN' ? 'हिंदी' : 
                   language === 'te-IN' ? 'తెలుగు' : 'English'}
                </div>
                {sagaStory.length > 0 ? (
                  <div className="story-preview">
                    <h4>Your Story ({sagaStory.length} scenes):</h4>
                    {sagaStory.map((scene, index) => (
                      <div key={index} className="story-scene">
                        <span className="scene-number">Scene {index + 1}:</span>
                        {isEditingStory ? (
                          <input 
                            type="text" 
                            value={scene}
                            onChange={(e) => updateStoryLine(index, e.target.value)}
                            className="story-edit-input"
                          />
                        ) : (
                          <span className="scene-text">{scene}</span>
                        )}
                      </div>
                    ))}
                    {isListening && transcript && (
                      <div className="current-scene">
                        <span className="scene-number">Scene {sagaStory.length + 1} (Recording...):</span>
                        <span className="scene-text">{transcript}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  transcript || (isListening ? 'Tell your story... Pause for 2 seconds to cut scenes, 5 seconds to stop recording.' : 'Your story will appear here as you speak')
                )}
              </div>
            </div>

            <div className="saga-controls">
              <button 
                onClick={isListening ? stopListening : startListening} 
                className={`voice-button ${isListening ? 'listening' : ''}`}
              >
                <i className={`fas fa-${isListening ? 'microphone-slash' : 'microphone'}`}></i>
                {isListening ? 'Stop Recording' : 'Start Recording Story'}
              </button>

              {sagaStory.length > 0 && (
                <>
                  <button 
                    onClick={handleEditStory}
                    className="edit-button"
                  >
                    <i className="fas fa-edit"></i> Edit Story
                  </button>

                  <button 
                    onClick={handleGenerate} 
                    disabled={isLoading}
                    className="generate-button"
                  >
                    <i className="fas fa-magic"></i> Generate All Images
                  </button>

                  {sagaImages.length > 0 && (
                    <>
                      <button onClick={playStory} disabled={isPlayingStory} className="play-button">
                        <i className="fas fa-play"></i> Play Story
                      </button>
                      {isPlayingStory && (
                        <button onClick={() => {
                          window.speechSynthesis.cancel();
                          setIsPlayingStory(false);
                          setCurrentSagaScene(0);
                        }} className="stop-button">
                          <i className="fas fa-stop"></i> Stop Story
                        </button>
                      )}
                      <button onClick={saveSagaProject} className="save-button">
                        <i className="fas fa-save"></i> Save Project
                      </button>
                    </>
                  )}
                </>
              )}

              <button onClick={() => {
                resetTranscript();
                setSagaStory([]);
                setSagaImages([]);
                setCurrentSagaScene(0);
              }} disabled={isLoading}>
                <i className="fas fa-eraser"></i> Clear All
              </button>
            </div>

            {/* Loading indicator for saga mode */}
            {isLoading && currentMode === 'saga' && (
              <div className="voice-loading">
                <div className="loading-spinner"></div>
                <p>Creating your story images...</p>
              </div>
            )}

            {/* Saga Images Display */}
            {sagaImages.length > 0 && (
              <div className="saga-storyboard">
                <h3>
                  <i className="fas fa-images"></i> Your Story Storyboard
                  {isPlayingStory && ` - Scene ${currentSagaScene + 1}`}
                </h3>
                <div className="storyboard-container-horizontal">
                  {sagaImages.map((sceneData, index) => (
                    <div 
                      key={index} 
                      id={`scene-${index}`}
                      className={`storyboard-scene-horizontal ${isPlayingStory && index === currentSagaScene ? 'active-scene-playing' : ''}`}
                    >
                      <div className="scene-number-badge">Scene {index + 1}</div>
                      <img src={sceneData.image} alt={`Scene ${index + 1}`} />
                      <div className="scene-text">{sceneData.prompt}</div>
                      <div className="scene-actions">
                        <button onClick={() => downloadImage(sceneData.image)}>
                          <i className="fas fa-download"></i>
                        </button>
                        <button onClick={() => saveImage(sceneData.image)}>
                          <i className="fas fa-save"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Scene Modal */}
            {showAddSceneModal && (
              <div className="modal-overlay" onClick={() => setShowAddSceneModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Add New Scene</h3>
                  <div className="current-language-display">
                    <i className="fas fa-globe"></i> Recording in: 
                    {language === 'en-IN' ? ' English' : 
                     language === 'hi-IN' ? ' हिंदी' : 
                     language === 'te-IN' ? ' తెలుగు' : ' English'}
                  </div>
                  <div className="add-scene-options">
                    <div className="text-input-section">
                      <textarea
                        value={newSceneText}
                        onChange={(e) => setNewSceneText(e.target.value)}
                        placeholder={
                          language === 'hi-IN' ? 'यहाँ अपना नया दृश्य लिखें...' :
                          language === 'te-IN' ? 'మీ కొత్త దృశ్యాన్ని ఇక్కడ టైప్ చేయండి...' :
                          'Type your new scene here...'
                        }
                        rows={4}
                        className="scene-textarea"
                      />
                      <button 
                        onClick={() => addNewScene(newSceneText)}
                        disabled={!newSceneText.trim()}
                        className="add-text-scene-btn"
                      >
                        <i className="fas fa-plus"></i> Add Text Scene
                      </button>
                    </div>

                    <div className="voice-input-section">
                      <div className="voice-recording-status">
                        {isAddingVoiceScene ? (
                          <>
                            <div className="recording-indicator">
                              <div className="pulse-dot"></div>
                              {language === 'hi-IN' ? 'रिकॉर्डिंग... समाप्त होने पर स्टॉप क्लिक करें' :
                               language === 'te-IN' ? 'రికార్డింగ్... పూర్తయినప్పుడు స్టాప్ క్లిక్ చేయండి' :
                               'Recording... Click stop when done'}
                            </div>
                            <div className="live-transcript">
                              {transcript || (
                                language === 'hi-IN' ? 'अपना दृश्य बोलें...' :
                                language === 'te-IN' ? 'మీ దృశ్యాన్ని మాట్లాడండి...' :
                                'Speak your scene...'
                              )}
                            </div>
                          </>
                        ) : (
                          language === 'hi-IN' ? 'आवाज़ के साथ अपना दृश्य रिकॉर्ड करने के लिए क्लिक करें' :
                          language === 'te-IN' ? 'వాయిస్‌తో మీ దృశ్యాన్ని రికార్డ్ చేయడానికి క్లిక్ చేయండి' :
                          'Click to record your scene with voice'
                        )}
                      </div>
                      <button 
                        onClick={isAddingVoiceScene ? stopVoiceSceneRecording : startVoiceSceneRecording}
                        className={`add-voice-scene-btn ${isAddingVoiceScene ? 'recording' : ''}`}
                      >
                        <i className={`fas fa-${isAddingVoiceScene ? 'stop' : 'microphone'}`}></i>
                        {isAddingVoiceScene ? 'Stop Recording' : 'Record Voice Scene'}
                      </button>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button onClick={() => setShowAddSceneModal(false)} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Story Modal */}
            {showEditModal && (
              <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Edit Story Options</h3>
                  <div className="edit-options">
                    <div className="edit-option-section">
                      <h4>Edit with Voice</h4>
                      <div className="voice-edit-buttons">
                        <button 
                          onClick={() => startVoiceEdit('continue')}
                          className="voice-edit-btn continue-btn"
                        >
                          <i className="fas fa-play"></i> Continue Prompt
                        </button>
                        <button 
                          onClick={() => startVoiceEdit('restart')}
                          className="voice-edit-btn restart-btn"
                        >
                          <i className="fas fa-redo"></i> Restart Prompt
                        </button>
                      </div>
                    </div>
                    <div className="edit-option-section">
                      <h4>Edit with Text</h4>
                      <button 
                        onClick={startTextEdit}
                        className="text-edit-btn"
                      >
                        <i className="fas fa-keyboard"></i> Edit Text Manually
                      </button>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button onClick={() => setShowEditModal(false)} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Project Title Modal */}
            {showProjectTitleModal && (
              <div className="modal-overlay" onClick={() => setShowProjectTitleModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Give Title for Project</h3>
                  <div className="project-title-section">
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="Enter your project title..."
                      className="project-title-input"
                      maxLength={50}
                    />
                    <p className="title-hint">This will be the name of your saved saga project</p>
                  </div>
                  <div className="modal-actions">
                    <button onClick={() => setShowProjectTitleModal(false)} className="cancel-btn">
                      Cancel
                    </button>
                    <button 
                      onClick={confirmSaveProject}
                      disabled={!projectTitle.trim()}
                      className="confirm-save-btn"
                    >
                      <i className="fas fa-save"></i> Save Project
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Your Designs Modal */}
            {showYourDesigns && (
              <div className="modal-overlay full-screen" onClick={closeYourDesigns}>
                <div className="designs-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="designs-header">
                    <h2><i className="fas fa-palette"></i> Your Designs</h2>
                    <button onClick={closeYourDesigns} className="close-designs-btn">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  
                  <div className="designs-content">
                    <div className="saga-projects-section">
                      <h3><i className="fas fa-book"></i> Saga Projects ({sagaProjects.length})</h3>
                      {sagaProjects.length === 0 ? (
                        <div className="no-projects">
                          <i className="fas fa-folder-open"></i>
                          <p>No saga projects saved yet.</p>
                          <p>Create and save your first story!</p>
                        </div>
                      ) : (
                        <div className="projects-grid">
                          {sagaProjects.map((project) => (
                            <div key={project.id} className="project-card">
                              <div className="project-header">
                                <h4>{project.name}</h4>
                                <div className="project-actions">
                                  <button 
                                    onClick={() => loadProject(project)}
                                    className="load-btn"
                                    title="Load Project"
                                  >
                                    <i className="fas fa-folder-open"></i>
                                  </button>
                                  <button 
                                    onClick={() => generateProjectPDF(project)}
                                    className="pdf-btn"
                                    title="Generate PDF"
                                  >
                                    <i className="fas fa-file-pdf"></i>
                                  </button>
                                  <button 
                                    onClick={() => deleteProject(project.id)}
                                    className="delete-btn"
                                    title="Delete Project"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="project-info">
                                <p><strong>Scenes:</strong> {project.story.length}</p>
                                <p><strong>Created:</strong> {project.createdAt}</p>
                                {project.createdTime && (
                                  <p><strong>Time:</strong> {project.createdTime}</p>
                                )}
                              </div>
                              <div className="project-preview">
                                {project.images.slice(0, 3).map((img, idx) => (
                                  <img 
                                    key={idx} 
                                    src={img.image} 
                                    alt={`Scene ${idx + 1}`}
                                    className="preview-image"
                                  />
                                ))}
                                {project.images.length > 3 && (
                                  <div className="more-images">+{project.images.length - 3}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : currentMode === 'video' ? (
          // Video Mode UI
          <div className="video-mode">
            <div className="voice-container">
              <div className={`voice-animation ${isListening ? 'active' : ''}`}>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="mic-icon">
                  <i className="fas fa-microphone"></i>
                </div>
              </div>

              <div className="transcript-box">
                <div className="current-language-indicator">
                  <i className="fas fa-globe"></i> 
                  {language === 'en-IN' ? 'English' : 
                   language === 'hi-IN' ? 'हिंदी' : 
                   language === 'te-IN' ? 'తెలుగు' : 'English'}
                </div>
                {videoPrompts.length > 0 ? (
                  <div className="video-prompts-preview">
                    <h4>Your Video Prompts ({videoPrompts.length} prompts):</h4>
                    {videoPrompts.map((prompt, index) => (
                      <div key={index} className="video-prompt">
                        <span className="prompt-number">Prompt {index + 1}:</span>
                        <span className="prompt-text">{prompt}</span>
                      </div>
                    ))}
                    {isListening && transcript && (
                      <div className="current-prompt">
                        <span className="prompt-number">Prompt {videoPrompts.length + 1} (Recording...):</span>
                        <span className="prompt-text">{transcript}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  transcript || (isListening ? 'Describe your video scenes... Pause for 2 seconds between prompts, 5 seconds to stop recording.' : 'Your video prompts will appear here as you speak')
                )}

                {/* Loading indicator positioned directly below voice prompt */}
                {isGeneratingVideos && (
                  <div className="voice-loading-inline">
                    <div className="loading-spinner-small"></div>
                    <p>Generating your videos...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="video-controls">
              <button 
                onClick={isListening ? stopListening : startListening} 
                className={`voice-button ${isListening ? 'listening' : ''}`}
              >
                <i className={`fas fa-${isListening ? 'microphone-slash' : 'microphone'}`}></i>
                {isListening ? 'Stop Recording' : 'Start Recording Prompts'}
              </button>

              {videoPrompts.length > 0 && (
                <>
                  <button 
                    onClick={handleGenerate} 
                    disabled={isGeneratingVideos}
                    className="generate-button"
                  >
                    <i className="fas fa-video"></i> 
                    {isGeneratingVideos ? 'Generating Videos...' : 'Generate Videos (3 per prompt)'}
                  </button>

                  {generatedVideos.length > 0 && (
                    <button onClick={saveVideoProject} className="save-button">
                      <i className="fas fa-save"></i> Save Video Project
                    </button>
                  )}
                </>
              )}

              <button onClick={() => {
                resetTranscript();
                setVideoPrompts([]);
                setGeneratedVideos([]);
              }} disabled={isGeneratingVideos}>
                <i className="fas fa-eraser"></i> Clear All
              </button>
            </div>

            {/* Video Generation Progress */}
            {isGeneratingVideos && (
              <div className="video-generation-progress">
                <h4>Generating Videos...</h4>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${videoGenerationProgress}%` }}
                  ></div>
                </div>
                <p>{Math.round(videoGenerationProgress)}% Complete</p>
              </div>
            )}

            {/* Generated Videos Display */}
            {generatedVideos.length > 0 && (
              <div className="generated-videos">
                <h3>
                  <i className="fas fa-video"></i> Generated Videos
                </h3>
                <div className="videos-grid">
                  {videoPrompts.map((prompt, promptIndex) => {
                    const promptVideos = generatedVideos.filter(v => v.promptIndex === promptIndex);
                    return (
                      <div key={promptIndex} className="prompt-videos-group">
                        <h4>Prompt {promptIndex + 1}: {prompt}</h4>
                        <div className="videos-row">
                          {promptVideos.map((videoData, videoIndex) => (
                            <div key={videoData.id} className="video-card">
                              <div className="video-number-badge">Video {videoData.videoNumber}</div>
                              {videoData.status === 'completed' && videoData.videoUrl ? (
                                <video 
                                  controls 
                                  width="300" 
                                  height="200"
                                  src={videoData.videoUrl}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              ) : videoData.status === 'failed' ? (
                                <div className="video-error">
                                  <i className="fas fa-exclamation-triangle"></i>
                                  <p>Failed to generate</p>
                                  <small>{videoData.error}</small>
                                </div>
                              ) : (
                                <div className="video-loading">
                                  <i className="fas fa-spinner fa-spin"></i>
                                  <p>Generating...</p>
                                </div>
                              )}
                              <div className="video-actions">
                                {videoData.videoUrl && (
                                  <a 
                                    href={videoData.videoUrl} 
                                    download={`video_${promptIndex + 1}_${videoData.videoNumber}.mp4`}
                                    className="download-btn"
                                  >
                                    <i className="fas fa-download"></i>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Original Single Image Mode UI
          <>
            <div className="voice-container">
              <div className={`voice-animation ${isListening ? 'active' : ''}`}>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="mic-icon">
                  <i className="fas fa-microphone"></i>
                </div>
              </div>

              <div className="transcript-box">
                {finalTranscript || transcript || (isListening ? 'Listening... Speak clearly and pause briefly when done.' : 'Your description will appear here')}
                {finalTranscript && <div style={{fontSize: '0.9em', color: '#28a745', marginTop: '0.5rem'}}>✓ Complete sentence captured</div>}

                {/* Loading indicator positioned directly below voice prompt */}
                {isLoading && currentMode === 'single' && (
                  <div className="voice-loading-inline">
                    <div className="loading-spinner-small"></div>
                    <p>Creating your images...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="controls">
              <button 
                onClick={isListening ? stopListening : startListening} 
                className={`voice-button ${isListening ? 'listening' : ''}`}
              >
                <i className={`fas fa-${isListening ? 'microphone-slash' : 'microphone'}`}></i>
                {isListening ? 'Stop Speaking' : 'Start Speaking'}
              </button>

              <button 
                onClick={handleGenerate} 
                disabled={isLoading || (!transcript && !finalTranscript)}
                className="generate-button"
              >
                <i className="fas fa-magic"></i> Generate Images
              </button>

              <button onClick={() => {
                resetTranscript();
                setFinalTranscript('');
                if (speechTimeout) {
                  clearTimeout(speechTimeout);
                }
              }} disabled={isLoading}>
                <i className="fas fa-eraser"></i> Clear
              </button>
            </div>

            <div className="navigation">
              <button onClick={goBack} disabled={currentSetIndex === 0}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <span>Prompt: {currentSet.prompt.substring(0, 50)}{currentSet.prompt.length > 50 ? '...' : ''}</span>
              <button onClick={goForward} disabled={currentSetIndex === imageSets.length - 1}>
                Next <i className="fas fa-arrow-right"></i>
              </button>
            </div>

            <div className="images-container">
              {currentSet.images.map((url, index) => (
                url ? (
                  <div 
                    key={index} 
                    className={`image-card ${selectedImageIndex === index ? 'selected' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={url} alt={`Generated ${index}`} />
                    <div className="image-actions">
                      <button onClick={() => downloadImage(url)}>
                        <i className="fas fa-download"></i>
                      </button>
                      <button onClick={() => saveImage(url)}>
                        <i className="fas fa-save"></i>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={index} className="image-card placeholder">
                    {isLoading ? 'Generating...' : 'Image will appear here'}
                  </div>
                )
              ))}
            </div>

            {selectedImageIndex !== null && (
              <div className="selected-prompt">
                <h3>
                  <i className="fas fa-mouse-pointer"></i> Selected Image {selectedImageIndex + 1}
                </h3>
                <p>Speak a new description to transform this image</p>
              </div>
            )}

            {currentSetIndex > 0 && (
              <div className="regenerated-section">
                <h2><i className="fas fa-sync-alt"></i> Regenerated From Previous</h2>
                <div className="images-container">
                  {imageSets[currentSetIndex - 1].images.map((url, index) => (
                    url && (
                      <div key={index} className="image-card">
                        <img src={url} alt={`Previous ${index}`} />
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {savedImages.length > 0 && (
              <div className="saved-section">
                <h2><i className="fas fa-bookmark"></i> Saved Images</h2>
                <div className="saved-images">
                  {savedImages.map((url, index) => (
                    <div key={index} className="saved-image">
                      <img src={url} alt={`Saved ${index}`} />
                      <button onClick={() => downloadImage(url)}>
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}



        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default VoiceToImage;