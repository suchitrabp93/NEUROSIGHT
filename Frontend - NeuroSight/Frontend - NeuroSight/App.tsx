// App.tsx
import Voice from '@react-native-voice/voice';
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

// Replace with your API endpoint
const API_ENDPOINT = 'http://127.0.0.1:5000/caption';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [caption, setCaption] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Request audio permissions
    (async () => {
      const audioStatus = await Audio.requestPermissionsAsync();
      setAudioPermission(audioStatus.status === 'granted');
    })();

    // Setup voice recognition
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle speech recognition results
  const onSpeechResults = (e: any) => {
    if (e.value && e.value.length > 0) {
      const spokenText = e.value[0].toLowerCase();
      console.log('Recognized:', spokenText);
      
      // Check for language match
      for (const [langName, langCode] of Object.entries(LANGUAGE_MAP)) {
        if (spokenText.includes(langName)) {
          setSelectedLanguage(langCode);
          Speech.speak(`${langName} selected`, { language: 'en' });
          setIsListening(false);
          return;
        }
      }
      
      // Default to English
      Speech.speak('Language not recognized. Using English.', { language: 'en' });
      setSelectedLanguage('en');
      setIsListening(false);
    }
  };

  const onSpeechError = (e: any) => {
    console.error('Speech error:', e.error);
    setIsListening(false);
  };

  // Start voice language selection
  const startVoiceLanguageSelection = async () => {
    try {
      setIsListening(true);
      
      // Prompt user
      await Speech.speak(
        'Please say the language you want to use, such as English, Hindi, Tamil, Telugu, Kannada, or French.',
        { language: 'en' }
      );
      
      // Wait for prompt to finish then start listening
      setTimeout(async () => {
        try {
          await Voice.start('en-US');
        } catch (error) {
          console.error('Voice start error:', error);
          setIsListening(false);
        }
      }, 6000);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to start voice recognition');
      setIsListening(false);
    }
  };

  // Capture and process image
  const captureAndDescribe = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      
      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo || !photo.base64) {
        setIsProcessing(false);
        return;
      }

      // Send to your backend API
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: photo.base64,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      
      if (data.caption) {
        setCaption(data.caption);
        
        // Speak the caption in selected language
        await Speech.speak(data.translated || data.caption, {
          language: selectedLanguage,
          rate: 0.9,
        });
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process image. Make sure backend is running.');
    }
  };

  // Start continuous capture
  const startContinuousCapture = () => {
    setIsRunning(true);
    captureAndDescribe();
    
    intervalRef.current = setInterval(() => {
      captureAndDescribe();
    }, 5000); // Capture every 5 seconds
  };

  // Stop continuous capture
  const stopContinuousCapture = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Handle main button press
  const handleStartInteraction = async () => {
    await startVoiceLanguageSelection();
    
    // After language selection, start capturing
    setTimeout(() => {
      if (!isListening) {
        startContinuousCapture();
      }
    }, 8000);
  };

  // Check permissions
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
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (audioPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Requesting audio permissions...</Text>
      </View>
    );
  }

  if (audioPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Microphone permission is required</Text>
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
          <Text style={styles.title}>AI Scene Describer</Text>
          
          {isListening && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.statusText}>Listening for language...</Text>
            </View>
          )}
          
          {isProcessing && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.statusText}>Processing image...</Text>
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
                onPress={handleStartInteraction}
                disabled={isListening || isProcessing}
              >
                <Text style={styles.buttonText}>🎤 Start Voice Interaction</Text>
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
              Language: {Object.keys(LANGUAGE_MAP).find(k => LANGUAGE_MAP[k] === selectedLanguage) || 'English'}
            </Text>
            {isRunning && (
              <Text style={styles.infoText}>
                Auto-capturing every 5 seconds
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  text: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 20,
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
});