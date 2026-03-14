"""
Audio utilities for chunking and processing audio files
"""
import tempfile
import os
from typing import List, Tuple
import asyncio
import concurrent.futures

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

try:
    import speech_recognition as sr
except ImportError:
    sr = None


class AudioChunker:
    """Utility class for chunking audio files"""
    
    def __init__(self, chunk_duration_ms: int = 5000):
        """
        Initialize AudioChunker
        
        Args:
            chunk_duration_ms: Duration of each chunk in milliseconds (default: 5 seconds)
        """
        self.chunk_duration_ms = chunk_duration_ms
        
    def chunk_audio_file(self, file_path: str) -> List[str]:
        """
        Split audio file into chunks
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            List of paths to chunk files
        """
        if AudioSegment is None:
            raise ImportError("pydub is required for audio chunking")
            
        try:
            # Load audio file
            audio = AudioSegment.from_file(file_path)
            
            # Calculate number of chunks
            total_duration = len(audio)
            num_chunks = (total_duration + self.chunk_duration_ms - 1) // self.chunk_duration_ms
            
            chunk_files = []
            
            for i in range(num_chunks):
                start_time = i * self.chunk_duration_ms
                end_time = min((i + 1) * self.chunk_duration_ms, total_duration)
                
                # Extract chunk
                chunk = audio[start_time:end_time]
                
                # Create temporary file for chunk
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                    chunk_path = temp_file.name
                    
                # Export chunk as WAV
                chunk.export(chunk_path, format="wav")
                chunk_files.append(chunk_path)
                
            return chunk_files
            
        except Exception as e:
            print(f"Error chunking audio: {e}")
            return []
    
    def cleanup_chunks(self, chunk_files: List[str]):
        """Clean up temporary chunk files"""
        for chunk_file in chunk_files:
            try:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
            except Exception as e:
                print(f"Error cleaning up chunk {chunk_file}: {e}")


class ParallelSpeechRecognizer:
    """Parallel speech recognition for audio chunks"""
    
    def __init__(self, max_workers: int = 3):
        """
        Initialize ParallelSpeechRecognizer
        
        Args:
            max_workers: Maximum number of parallel workers
        """
        self.max_workers = max_workers
        
    def recognize_chunk(self, chunk_path: str, language: str = "vi-VN") -> Tuple[int, str]:
        """
        Recognize speech in a single chunk
        
        Args:
            chunk_path: Path to audio chunk
            language: Language code for recognition
            
        Returns:
            Tuple of (chunk_index, recognized_text)
        """
        if sr is None:
            raise ImportError("speech_recognition is required")
            
        try:
            recognizer = sr.Recognizer()
            
            with sr.AudioFile(chunk_path) as source:
                audio_data = recognizer.record(source)
                
            # Extract chunk index from filename
            try:
                filename = os.path.basename(chunk_path)
                if '_' in filename:
                    # Try to extract index from filename like "chunk_000_timestamp.wav"
                    parts = filename.split('_')
                    if len(parts) >= 2:
                        # Look for numeric part (could be at index 1 or 2)
                        for part in parts[1:]:
                            try:
                                chunk_index = int(part.split('.')[0])
                                break
                            except ValueError:
                                continue
                        else:
                            chunk_index = 0
                    else:
                        chunk_index = 0
                else:
                    chunk_index = 0
            except (ValueError, IndexError, AttributeError):
                chunk_index = 0
            
            try:
                text = recognizer.recognize_google(audio_data, language=language)
                return (chunk_index, text)
            except sr.UnknownValueError:
                return (chunk_index, "")
            except sr.RequestError as e:
                print(f"Recognition error for chunk {chunk_index}: {e}")
                return (chunk_index, "")
                
        except Exception as e:
            print(f"Error processing chunk {chunk_path}: {e}")
            return (0, "")

    def recognize_chunk_with_index(self, chunk_path: str, chunk_index: int, language: str = "vi-VN") -> Tuple[int, str]:
        """
        Recognize speech in a single chunk with explicit index
        
        Args:
            chunk_path: Path to audio chunk
            chunk_index: Explicit chunk index
            language: Language code for recognition
            
        Returns:
            Tuple of (chunk_index, recognized_text)
        """
        if sr is None:
            raise ImportError("speech_recognition is required")
            
        try:
            recognizer = sr.Recognizer()
            
            with sr.AudioFile(chunk_path) as source:
                audio_data = recognizer.record(source)
            
            try:
                text = recognizer.recognize_google(audio_data, language=language)
                return (chunk_index, text)
            except sr.UnknownValueError:
                return (chunk_index, "")
            except sr.RequestError as e:
                print(f"Recognition error for chunk {chunk_index}: {e}")
                return (chunk_index, "")
                
        except Exception as e:
            print(f"Error processing chunk {chunk_path} (index {chunk_index}): {e}")
            return (chunk_index, "")
    
    async def recognize_chunks_parallel(self, chunk_files: List[str], language: str = "vi-VN") -> str:
        """
        Recognize speech in multiple chunks in parallel
        
        Args:
            chunk_files: List of chunk file paths
            language: Language code for recognition
            
        Returns:
            Combined recognized text
        """
        loop = asyncio.get_event_loop()
        
        # Create numbered chunk files for proper ordering
        numbered_chunks = []
        chunk_mapping = {}  # Map new path to original index
        
        for i, chunk_file in enumerate(chunk_files):
            # Create unique filename to avoid conflicts
            base_dir = os.path.dirname(chunk_file)
            import time
            import random
            
            # Create a more unique timestamp with random component
            timestamp = str(int(time.time() * 1000000)) + str(random.randint(1000, 9999))
            new_name = f"chunk_{i:03d}_{timestamp}.wav"
            new_path = os.path.join(base_dir, new_name)
            
            # Ensure unique filename
            counter = 0
            while os.path.exists(new_path) and counter < 100:
                counter += 1
                new_name = f"chunk_{i:03d}_{timestamp}_{counter}.wav"
                new_path = os.path.join(base_dir, new_name)
            
            try:
                # Double check and remove if exists
                if os.path.exists(new_path):
                    try:
                        os.remove(new_path)
                    except:
                        pass  # If can't remove, try with different name
                        counter += 1
                        new_name = f"chunk_{i:03d}_{timestamp}_{counter}_alt.wav"
                        new_path = os.path.join(base_dir, new_name)
                
                os.rename(chunk_file, new_path)
                numbered_chunks.append(new_path)
                chunk_mapping[new_path] = i
                print(f"Renamed chunk {i}: {os.path.basename(chunk_file)} -> {os.path.basename(new_path)}")
            except Exception as e:
                print(f"Error renaming chunk {i}: {e}")
                # If rename fails, use original file
                numbered_chunks.append(chunk_file)
                chunk_mapping[chunk_file] = i
        
        try:
            # Process chunks in parallel with explicit index mapping
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                tasks = []
                for chunk_file in numbered_chunks:
                    chunk_index = chunk_mapping[chunk_file]
                    task = loop.run_in_executor(
                        executor, 
                        self.recognize_chunk_with_index, 
                        chunk_file, 
                        chunk_index,
                        language
                    )
                    tasks.append(task)
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Sort results by chunk index and combine text
            valid_results = []
            for result in results:
                if isinstance(result, tuple) and len(result) == 2:
                    valid_results.append(result)
                elif isinstance(result, Exception):
                    print(f"Chunk processing exception: {result}")
            
            # Sort by chunk index
            valid_results.sort(key=lambda x: x[0])
            
            # Combine text
            combined_text = " ".join([text for _, text in valid_results if text.strip()])
            
            return combined_text.strip()
            
        finally:
            # Always cleanup the renamed chunk files
            chunker = AudioChunker()
            chunker.cleanup_chunks(numbered_chunks)


class TextChunker:
    """Utility for chunking text for streaming TTS"""
    
    @staticmethod
    def chunk_by_sentences(text: str, max_chunk_length: int = 200) -> List[str]:
        """
        Split text into chunks by sentences
        
        Args:
            text: Input text
            max_chunk_length: Maximum length of each chunk
            
        Returns:
            List of text chunks
        """
        # Split by common sentence endings
        import re
        sentences = re.split(r'[.!?]+', text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # If adding this sentence would exceed max length, start new chunk
            if current_chunk and len(current_chunk + " " + sentence) > max_chunk_length:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
        
        # Add remaining chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
            
        return chunks
    
    @staticmethod
    def chunk_by_words(text: str, words_per_chunk: int = 20) -> List[str]:
        """
        Split text into chunks by word count
        
        Args:
            text: Input text
            words_per_chunk: Number of words per chunk
            
        Returns:
            List of text chunks
        """
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), words_per_chunk):
            chunk = " ".join(words[i:i + words_per_chunk])
            chunks.append(chunk)
            
        return chunks