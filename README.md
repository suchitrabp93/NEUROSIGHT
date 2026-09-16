# NeuroSight – AI-Based Assistive System for Visually Impaired People

## About the Project

NeuroSight is an AI-based assistive system developed to help visually impaired people understand their surroundings and perform daily activities more independently.

The system uses a **camera and microphone available on a smartphone or laptop** instead of requiring special hardware. It uses different AI models to detect objects, recognize faces, read text, and understand images. The detected information is given to the user through **voice/audio feedback**.

## Main Features

### 1. Object Detection

NeuroSight uses **YOLO** to detect objects in the user's surroundings. The detected objects are converted into audio information so that the user can understand what is around them.

### 2. Face Recognition

The system can recognize previously registered/known faces using face recognition models. It provides an audio indication when a known or unknown person is detected.

### 3. Text Reading

Using **OCR**, NeuroSight can detect and read text from documents, printed materials, and handwritten content. The extracted text can then be converted into speech.

### 4. Image Captioning

The system uses **BLIP image captioning** to generate a description of an image. This helps the user understand the overall content of a scene or picture.

### 5. Voice Assistance

NeuroSight provides voice-based interaction so that users can give commands and receive information without depending mainly on visual interfaces.

### 6. Multilingual Support

The system can provide audio output in different languages, making the application more useful for users from different regions.

### 7. Emergency Assistance

An emergency assistance feature can be used to send alerts when the user needs help.

## How the System Works

The user provides input through the **camera or microphone**.

```text
Camera / Microphone
        ↓
   NeuroSight System
        ↓
   AI Model Processing
        ↓
Object / Face / Text / Image Detection
        ↓
   Information Processing
        ↓
    Voice Feedback
        ↓
        User
```

Different AI models are used depending on the task. For example, YOLO is used for object detection, face recognition models are used for identifying people, OCR is used for reading text, and BLIP is used for generating image descriptions.

## Technologies Used

* Python
* YOLO
* OpenCV
* FaceNet / MobileFaceNet
* OCR
* BLIP
* Natural Language Processing
* Text-to-Speech
* Flask

## Why NeuroSight?

Many assistive solutions require dedicated hardware or expensive devices. NeuroSight focuses on using devices that people already have, such as **smartphones and laptops**, to provide multiple AI-based assistance features in one system.

The main goal is to make the system **portable, affordable, and easy to use** while helping visually impaired users receive information about their surroundings through audio.

## Applications

NeuroSight can be useful for:

* Identifying objects while moving around
* Recognizing familiar people
* Reading documents and other text
* Understanding images and surroundings
* Getting information through voice
* Providing assistance during emergency situations

## Future Enhancements

Some features that can be added in the future are:

* GPS-based navigation and route guidance
* More regional language support
* Better offline/on-device processing
* Wearable device integration
* Vibration-based feedback
* Continuous learning and personalization

## Project Status

NeuroSight is a project developed as an AI-based assistive system combining **computer vision, deep learning, OCR, face recognition, image captioning, and voice assistance** into a single application.

## Author

**Suchitra B P**

B.E. – Artificial Intelligence and Machine Learning
