// app/(tabs)/index.tsx
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Language mapping
const LANGUAGE_MAP: { [key: string]: string } = {
  english: 'en',
  hindi: 'hi',
  kannada: 'kn',
  tamil: 'ta',
  telugu: 'te',
  french: 'fr',
};

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'French'];

// Hugging Face Inference API (FREE!)
const HF_API_KEY = '';
const HF_API_URL = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';

// Local backend
const USE_LOCAL_BACKEND = true;
const LOCAL_API_ENDPOINT = '*******/caption';

// Translation function
const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (targetLang === 'en') return text;
  
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0][0][0] || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [caption, setCaption] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(true);
  const [isListeningForLanguage, setIsListeningForLanguage] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const processingRef = useRef(false);
  const isRunningRef = useRef(false); // Track running state for the loop
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    (async () => {
      const audioStatus = await Audio.requestPermissionsAsync();
      setAudioPermission(audioStatus.status === 'granted');
    })();

    return () => {
      stopContinuousCapture();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  // Voice-based language selection with speech recognition
  const startVoiceLanguageSelection = async () => {
    try {
      setIsListeningForLanguage(true);

      // Prompt user
      await Speech.speak(
        'Please say your language: English, Hindi, Tamil, Telugu, Kannada, or French.',
        { language: 'en' }
      );

      // Wait for speech to finish
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Start recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);

      // Record for 4 seconds
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Stop recording
      await newRecording.stopAndUnloadAsync();
      const uri = newRecording.getURI();

      if (uri) {
        // Try to recognize speech
        const recognizedLang = await recognizeSpeechSimple(uri);
        
        if (recognizedLang) {
          const langCode = LANGUAGE_MAP[recognizedLang.toLowerCase()];
          setSelectedLanguage(langCode);
          await Speech.speak(`${recognizedLang} selected`, { language: 'en' });
          await new Promise(resolve => setTimeout(resolve, 2000));
          setShowLanguageSelector(false);
        } else {
          await Speech.speak('Language not recognized. Please select manually.', { language: 'en' });
        }
      }

      setIsListeningForLanguage(false);
      setRecording(null);
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListeningForLanguage(false);
      await Speech.speak('Please select language manually.', { language: 'en' });
    }
  };

  // Simple pattern matching for language recognition
  const recognizeSpeechSimple = async (audioUri: string): Promise<string | null> => {
    // For a real implementation, integrate:
    // - AssemblyAI (easiest, has free tier)
    // - Google Cloud Speech-to-Text
    // - Azure Speech Services
    
    // For now, this is a placeholder that returns null
    // The user can still use manual buttons
    return null;
  };

  const selectLanguage = async (langName: string) => {
    const langCode = LANGUAGE_MAP[langName.toLowerCase()];
    setSelectedLanguage(langCode);
    await Speech.speak(`${langName} selected`, { language: 'en' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    setShowLanguageSelector(false);
  };

  const captureAndDescribe = async () => {
    if (processingRef.current || !cameraRef.current) {
      console.log('Already processing or camera not ready');
      return;
    }

    try {
      processingRef.current = true;
      setIsProcessing(true);
      
      console.log('📸 Capturing image...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (!photo || !photo.base64) {
        console.error('Failed to capture photo');
        return;
      }

      console.log('🔄 Processing image...');

      // Use local backend
      const response = await fetch(LOCAL_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: photo.base64,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const captionText = data.caption || '';
      const translatedText = data.translated || captionText;
      
      console.log('✅ Caption:', captionText);
      console.log('🌍 Translated:', translatedText);
      
      setCaption(translatedText);

      // CRITICAL FIX: Wait for speech to complete before continuing
      await new Promise<void>((resolve) => {
        Speech.speak(translatedText, {
          language: selectedLanguage, // Use the selected language
          rate: 0.85,
          pitch: 1.0,
          onDone: () => {
            console.log('🔊 Speech completed');
            resolve();
          },
          onError: (error) => {
            console.log('🔊 Speech error:', error);
            resolve(); // Continue even if speech fails
          }
        });
      });

      console.log('✅ Processing complete, waiting 2 seconds...');
      
      // Wait 2 seconds before next capture
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert('Error', error.message || 'Failed to process image');
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      console.log('✅ Ready for next capture');
    }
  };

  const startContinuousCapture = async () => {
    setIsRunning(true);
    isRunningRef.current = true;
    
    console.log('🚀 Starting continuous capture loop');
    
    // Continuous loop that respects the isRunning flag
    while (isRunningRef.current) {
      await captureAndDescribe();
      
      // Check if still running after capture completes
      if (!isRunningRef.current) {
        break;
      }
    }
    
    console.log('⏹️ Continuous capture stopped');
  };

  const stopContinuousCapture = () => {
    console.log('🛑 Stopping continuous capture...');
    setIsRunning(false);
    isRunningRef.current = false;
    processingRef.current = false;
    Speech.stop();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required</Text>
        <TouchableOpacity style={[styles.button, styles.startButton]} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showLanguageSelector) {
    return (
      <View style={styles.container}>
        <View style={styles.languageContainer}>
          <Text style={styles.languageTitle}>🦯 NeuroSight</Text>
          <Text style={styles.languageSubtitle}>Select your language:</Text>
          
          {/* Voice Selection Button */}
          <TouchableOpacity
            style={[styles.button, styles.voiceButton]}
            onPress={startVoiceLanguageSelection}
            disabled={isListeningForLanguage}
          >
            {isListeningForLanguage ? (
              <>
                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.buttonText}>🎤 Listening...</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>🎤 Use Voice</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.orText}>— OR —</Text>
          
          {/* Manual Selection Buttons */}
          <View style={styles.languageGrid}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.languageButton}
                onPress={() => selectLanguage(lang)}
              >
                <Text style={styles.languageButtonText}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.languageNote}>
            Tap a language to begin
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>🦯 NeuroSight</Text>
            <TouchableOpacity 
              style={styles.changeLangButton}
              onPress={() => {
                stopContinuousCapture();
                setShowLanguageSelector(true);
              }}
            >
              <Text style={styles.changeLangText}>Change Language</Text>
            </TouchableOpacity>
          </View>
          
          {isProcessing && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.statusText}>Processing and speaking...</Text>
            </View>
          )}
          
          {caption ? (
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{caption}</Text>
            </View>
          ) : null}
          
          <View style={styles.buttonContainer}>
            {!isRunning ? (
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={startContinuousCapture}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>📸 Start Describing</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={stopContinuousCapture}
              >
                <Text style={styles.buttonText}>🛑 Stop</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Language: {Object.keys(LANGUAGE_MAP).find(k => LANGUAGE_MAP[k] === selectedLanguage)?.toUpperCase() || 'ENGLISH'}
            </Text>
            {isRunning && (
              <Text style={styles.infoText}>
                {isProcessing ? '⏸️ Processing...' : '✅ Ready for next capture'}
              </Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    marginBottom: 10,
  },
  changeLangButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  changeLangText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  text: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statusBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600',
  },
  captionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 15,
    marginVertical: 10,
  },
  captionText: {
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 280,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  voiceButton: {
    backgroundColor: '#34C759',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoText: {
    color: '#FFF',
    fontSize: 14,
    marginVertical: 2,
  },
  languageContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
  },
  languageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  languageSubtitle: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  orText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginVertical: 15,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  languageButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
    marginBottom: 10,
  },
  languageButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageNote: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 20,
  },
});