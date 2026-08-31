from chordnet_ismir_naive import ChordNet, chord_limit, ChordNetCNN
from mir.nn.train import NetworkInterface
from extractors.cqt import CQTV2, SimpleChordToID
from mir import io, DataEntry
from extractors.xhmm_ismir import XHMMDecoder
import numpy as np
from io_new.chordlab_io import ChordLabIO
from settings import DEFAULT_SR, DEFAULT_HOP_LENGTH
import sys
import os
import librosa
import traceback

# Get the absolute path to the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Define model paths with absolute paths
# Use the same model file names as the original implementation
MODEL_NAMES = [os.path.join(current_dir, 'cache_data', f'joint_chord_net_ismir_naive_v1.0_reweight(0.0,10.0)_s{i}.best') for i in range(5)]

def chord_recognition(audio_path, lab_path, chord_dict_name='submission'):
    """
    Real implementation of chord recognition using the Chord-CNN-LSTM model.

    Args:
        audio_path: Path to the audio file
        lab_path: Path to save the output lab file
        chord_dict_name: Name of the chord dictionary to use
    """
    print(f"Running chord recognition on {audio_path} with chord_dict={chord_dict_name}")

    # Use absolute paths for template files
    template_file = os.path.join(current_dir, 'data', f'{chord_dict_name}_chord_list.txt')

    try:
        # Initialize the HMM decoder
        hmm = XHMMDecoder(template_file=template_file)

        # Create a DataEntry object
        entry = DataEntry()
        entry.prop.set('sr', DEFAULT_SR)
        entry.prop.set('hop_length', DEFAULT_HOP_LENGTH)

        # Load the audio file
        try:
            entry.append_file(audio_path, io.MusicIO, 'music')
        except Exception as e:
            print(f"Error loading audio file: {e}")
            # Try to load with librosa and convert to the expected format
            y, sr = librosa.load(audio_path, sr=DEFAULT_SR)
            entry.music = y
            entry.prop.set('sr', sr)

        # Debug: Print audio information
        print(f"Audio file: {audio_path}")
        print(f"Audio duration: {len(entry.music) / entry.prop.sr:.2f} seconds")
        print(f"Audio sample rate: {entry.prop.sr} Hz")
        print(f"Audio shape: {entry.music.shape}")
        print(f"Audio min: {np.min(entry.music):.6f}, max: {np.max(entry.music):.6f}, mean: {np.mean(entry.music):.6f}")
        print(f"Audio non-zero elements: {np.count_nonzero(entry.music)} out of {entry.music.size} ({np.count_nonzero(entry.music)/entry.music.size*100:.2f}%)")

        # Extract CQT features
        try:
            print("Extracting CQT features...")
            entry.append_extractor(CQTV2, 'cqt')

            # Debug: Print CQT information
            print(f"CQT shape: {entry.cqt.shape}")
            print(f"CQT min: {np.min(entry.cqt):.6f}, max: {np.max(entry.cqt):.6f}, mean: {np.mean(entry.cqt):.6f}")
            print(f"CQT non-zero elements: {np.count_nonzero(entry.cqt)} out of {entry.cqt.size} ({np.count_nonzero(entry.cqt)/entry.cqt.size*100:.2f}%)")
        except Exception as e:
            print(f"Error extracting CQT features: {e}")
            raise

        # Run inference with all models and average the results
        probs = []
        for model_name in MODEL_NAMES:
            try:
                net = NetworkInterface(ChordNet(None), model_name, load_checkpoint=False)
                print(f'Inference: {model_name} on {audio_path}')
                model_probs = net.inference(entry.cqt)

                # Debug: Print raw probability shapes and values
                print(f"Model {model_name} probability shapes:")
                for i, prob in enumerate(model_probs):
                    print(f"  Prob {i} shape: {prob.shape}")
                    if i == 0:  # Triad probabilities
                        print(f"  First few triad probabilities (first frame):")
                        # Print top 5 triad probabilities for the first frame
                        top_indices = np.argsort(prob[0])[-5:][::-1]
                        for idx in top_indices:
                            print(f"    Index {idx}: {prob[0][idx]:.6f}")

                probs.append(model_probs)
            except Exception as e:
                print(f"Error during model inference with {model_name}: {e}")
                traceback.print_exc()
                # Continue with other models

        if not probs:
            raise Exception("All models failed to run inference")

        # Average the probabilities from all models
        probs = [np.mean([p[i] for p in probs], axis=0) for i in range(len(probs[0]))]

        # Debug: Print averaged probability shapes and values
        print("Averaged probability shapes:")
        for i, prob in enumerate(probs):
            print(f"  Prob {i} shape: {prob.shape}")
            if i == 0:  # Triad probabilities
                print(f"  First few averaged triad probabilities (first frame):")
                # Print top 5 triad probabilities for the first frame
                top_indices = np.argsort(prob[0])[-5:][::-1]
                for idx in top_indices:
                    print(f"    Index {idx}: {prob[0][idx]:.6f}")
                # Check if "N" chord (index 0) has high probability
                print(f"    'N' chord (index 0) probability: {prob[0][0]:.6f}")

        # Debug: Print HMM decoder parameters
        print(f"HMM decoder parameters:")
        print(f"  diff_trans_penalty: {hmm.diff_trans_penalty}")
        print(f"  beat_trans_penalty: {hmm.beat_trans_penalty}")
        print(f"  use_bass: {hmm.use_bass}")
        print(f"  use_7: {hmm.use_7}")
        print(f"  use_extended: {hmm.use_extended}")
        print(f"  Number of chord templates: {len(hmm.chord_names)}")

        # Decode the chord sequence using the HMM
        print("Running HMM decoder...")
        chordlab = hmm.decode_to_chordlab(entry, probs, False)

        # Debug: Print raw HMM output
        print("Raw HMM output (chordlab):")
        for i, chord in enumerate(chordlab[:10]):  # Print first 10 chords
            print(f"  Chord {i+1}: {chord}")

        # Save the chord labels to the output file
        entry.append_data(chordlab, ChordLabIO, 'chord')
        entry.save('chord', lab_path)

        # Print the number of chords detected
        with open(lab_path, 'r') as f:
            chord_lines = f.readlines()
            print(f"Generated {len(chord_lines)} chords and saved to {lab_path}")

            # Print the first few chords for debugging
            if chord_lines:
                print("First few chords from file:")
                for i, line in enumerate(chord_lines[:5]):
                    print(f"  {i+1}: {line.strip()}")

        # Check if we have any chords other than "N"
        has_real_chords = False
        for chord in chordlab:
            if chord[2] != "N":
                has_real_chords = True
                break

        if not has_real_chords:
            print("WARNING: Model only detected 'N' chords. This may indicate an issue with the audio file or model.")
            print("Possible causes:")
            print("  1. The audio file doesn't contain clear harmonic content")
            print("  2. The model checkpoint files might be corrupted or incompatible")
            print("  3. The CQT feature extraction might not be working correctly")
            print("  4. The HMM decoder parameters might need adjustment")

        return True
    except Exception as e:
        print(f"Error in chord recognition: {e}")
        traceback.print_exc()
        return False




if __name__ == '__main__':
    if len(sys.argv) == 3:
        success = chord_recognition(sys.argv[1], sys.argv[2])
        if not success:
            print("Chord recognition failed. Please check the error messages above.")
            sys.exit(1)
    elif len(sys.argv) == 4:
        success = chord_recognition(sys.argv[1], sys.argv[2], sys.argv[3])
        if not success:
            print("Chord recognition failed. Please check the error messages above.")
            sys.exit(1)
    else:
        print('Usage: chord_recognition.py path_to_audio_file path_to_output_file [chord_dict=submission]')
        print('\tChord dict can be one of the following: full, ismir2017, submission, extended')
        sys.exit(0)