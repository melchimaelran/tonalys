import numpy as np
from complex_chord import shift_complex_chord_array,Chord,NUM_TO_ABS_SCALE


class XHMMDecoder():

    def __init__(self,diff_trans_penalty=10.0,beat_trans_penalty=(5.0,15.0,30.0),
                 template_file='data/full_chord_list.txt',use_bass=True,use_7=True,use_extended=True):
        # Reduced diff_trans_penalty from 30.0 to 10.0 to make transitions between chords more likely
        # Reduced beat_trans_penalty from (15.0,45.0,100.0) to (5.0,15.0,30.0)
        self.diff_trans_penalty=diff_trans_penalty
        self.beat_trans_penalty=beat_trans_penalty
        self.use_bass=use_bass
        self.use_7=use_7
        self.use_extended=use_extended
        self.__init_known_chord_names(template_file)
        print(f"XHMMDecoder initialized with diff_trans_penalty={diff_trans_penalty}, beat_trans_penalty={beat_trans_penalty}")

    def __init_known_chord_names(self,template_file):
        known_chord_array_pool={}
        known_triad_bass=set()

        # Read the template file once
        with open(template_file, 'r') as f:
            test_chord_names = [line.strip() for line in f.readlines()]

        # Store the raw chord names from the template file
        self.chord_names = ['N'] + test_chord_names  # Start with "No chord"

        for chord_name in test_chord_names:
            if('/' in chord_name and not self.use_bass):
                continue
            if(':' in chord_name):
                tokens=chord_name.split(':')
                assert(tokens[0]=='C')
                c=Chord(chord_name)
                array=c.to_numpy()
                if(-2 in array):
                    continue
                for shift in range(12):
                    shift_name='%s:%s'%(NUM_TO_ABS_SCALE[shift],tokens[1])
                    shift_array=tuple(shift_complex_chord_array(array,shift))
                    if(shift_array in known_chord_array_pool):
                        continue
                    known_chord_array_pool[shift_array]=shift_name
                    if(shift_array[0:2] not in known_triad_bass):
                        known_triad_bass.add(shift_array[0:2])

        self.known_chord_array=[((0,-1,-1,-1,-1,-1),'N')]+list(known_chord_array_pool.items())
        self.known_triad_bass=[(0,-1)]+list(known_triad_bass)

    def get_chord_tag_obs(self,prob_list,triad_restriction=None):
        print("XHMMDecoder.get_chord_tag_obs called")

        suffix_probs=[None]*4
        (prob_triad,prob_bass,suffix_probs[0],suffix_probs[1],suffix_probs[2],suffix_probs[3])=prob_list

        # Debug: Print probability shapes
        print(f"  prob_triad shape: {prob_triad.shape}")
        print(f"  prob_bass shape: {prob_bass.shape}")
        for i, prob in enumerate(suffix_probs):
            if prob is not None:
                print(f"  suffix_probs[{i}] shape: {prob.shape}")
            else:
                print(f"  suffix_probs[{i}] is None")

        n_frame=prob_triad.shape[0]
        print(f"  n_frame: {n_frame}")

        # Bias against "N" chord by reducing its probability
        print("  Applying bias against 'N' chord (index 0)")
        prob_triad_biased = prob_triad.copy()
        prob_triad_biased[:, 0] *= 0.5  # Reduce "N" chord probability by half

        # Debug: Print first frame probabilities
        print(f"  First frame triad probabilities (top 5) BEFORE bias:")
        top_indices = np.argsort(prob_triad[0])[-5:][::-1]
        for idx in top_indices:
            print(f"    Index {idx}: {prob_triad[0][idx]:.6f}")
        print(f"    'N' chord (index 0) probability: {prob_triad[0][0]:.6f}")

        print(f"  First frame triad probabilities (top 5) AFTER bias:")
        top_indices = np.argsort(prob_triad_biased[0])[-5:][::-1]
        for idx in top_indices:
            print(f"    Index {idx}: {prob_triad_biased[0][idx]:.6f}")
        print(f"    'N' chord (index 0) probability: {prob_triad_biased[0][0]:.6f}")

        # Use the biased probabilities
        prob_triad = prob_triad_biased

        result_names=[]
        result_array=[]

        # Debug: Print known_chord_array info
        print(f"  known_chord_array length: {len(self.known_chord_array)}")
        print(f"  First few known_chord_array entries:")
        for i, (array, name) in enumerate(self.known_chord_array[:5]):
            print(f"    {i}: {array} -> {name}")

        for (array,name) in self.known_chord_array:
            is_in_range=True
            for i in range(6):
                if(prob_list[i] is not None and array[i]>=prob_list[i].shape[-1]):
                    is_in_range=False
                    break
            if(is_in_range):
                assert(array[0]>=0)
                result_names.append(name)
                result_array.append(list(array))

        print(f"  result_names length: {len(result_names)}")
        print(f"  First few result_names: {result_names[:5]}")

        result_array=np.array(result_array,dtype=np.int32)
        result_array[:,1]+=1 # bass adjust

        # Debug: Print result_array info
        print(f"  result_array shape: {result_array.shape}")
        print(f"  First few result_array entries:")
        for i in range(min(5, result_array.shape[0])):
            print(f"    {i}: {result_array[i]}")

        result_logprob=np.log(prob_triad[:,result_array[:,0]])

        # Debug: Print result_logprob info
        print(f"  Initial result_logprob shape: {result_logprob.shape}")

        bass_collect=result_array[:,1]>=0
        print(f"  bass_collect sum: {np.sum(bass_collect)}")

        if(self.use_bass):
            result_logprob[:,bass_collect]+=np.log(prob_bass[:,result_array[bass_collect,1]])
            print(f"  Added bass probabilities")

        for i in range(4):
            if((i==0 and self.use_7) or (i>0 and self.use_extended)):
                suffix_collect=result_array[:,i+2]>=0
                print(f"  suffix_collect[{i}] sum: {np.sum(suffix_collect)}")

                if np.sum(suffix_collect) > 0:
                    roots=(result_array[:,0]-1)%12
                    if(len(suffix_probs[i].shape)==3):
                        result_logprob[:,suffix_collect]+=\
                            np.log(suffix_probs[i][:,roots[suffix_collect],result_array[suffix_collect,i+2]])
                    else:
                        result_logprob[:,suffix_collect]+=\
                            np.log(suffix_probs[i][:,result_array[suffix_collect,i+2]])
                    print(f"  Added suffix[{i}] probabilities")

        if(triad_restriction is not None):
            print(f"  Applying triad_restriction")
            triad_restriction=np.array(triad_restriction)
            result_logprob[result_array[None,:,0]!=triad_restriction[:,0,None]]=-np.inf
            result_logprob[result_array[None,:,1]!=triad_restriction[:,1,None]]=-np.inf

        # Debug: Print final result_logprob info
        print(f"  Final result_logprob shape: {result_logprob.shape}")
        print(f"  First frame result_logprob (top 5):")
        top_indices = np.argsort(result_logprob[0])[-5:][::-1]
        for i, idx in enumerate(top_indices):
            if i < len(result_names):
                print(f"    Index {idx} ({result_names[idx]}): {result_logprob[0][idx]:.6f}")

        return result_names,result_logprob

    def get_triad_bass_obs(self,prob_list):
        (prob_triad,prob_bass,_,_,_,_)=prob_list
        n_frame=prob_triad.shape[0]
        result_array=[]
        for array in self.known_triad_bass:
            is_in_range=True
            for i in range(2):
                if(array[i]>=prob_list[i].shape[-1]):
                    is_in_range=False
                    break
            if(is_in_range):
                assert(array[0]>=0)
                result_array.append(list(array))
        result_array=np.array(result_array,dtype=np.int32)
        result_array[:,1]+=1 # bass adjust
        result_logprob=np.log(prob_triad[:,result_array[:,0]])
        bass_collect=result_array[:,1]>=0
        result_logprob[:,bass_collect]+=np.log(prob_bass[:,result_array[bass_collect,1]])

        return result_array,result_logprob

    def decode(self,prob_list,beat_arr,triad_restriction=None):
        print("XHMMDecoder.decode called")
        print(f"  triad_restriction: {triad_restriction is not None}")

        result_names,result_logprob=self.get_chord_tag_obs(prob_list,triad_restriction)

        # Debug: Print result_names and result_logprob
        print(f"  result_names length: {len(result_names)}")
        print(f"  First few result_names: {result_names[:5]}")
        print(f"  result_logprob shape: {result_logprob.shape}")

        n_frame=result_logprob.shape[0]
        n_chord=result_logprob.shape[1]
        print(f"  n_frame: {n_frame}, n_chord: {n_chord}")

        dp=np.zeros_like(result_logprob)
        dp[0,1:]-=np.inf
        dp_max_at=np.zeros((n_frame),dtype=np.int32)
        pre=np.zeros_like(result_logprob,dtype=np.int32)
        dp[0,:]+=result_logprob[0,:]
        dp_max_at[0]=np.argmax(dp[0,:])
        pre[0,:]=-1

        # Debug: Print initial dp state
        print(f"  Initial dp_max_at[0]: {dp_max_at[0]} (chord: {result_names[dp_max_at[0]]})")
        print(f"  Top 5 initial dp values:")
        top_indices = np.argsort(dp[0])[-5:][::-1]
        for idx in top_indices:
            print(f"    Index {idx} ({result_names[idx]}): {dp[0][idx]:.6f}")

        for t in range(1,n_frame):
            same_trans=dp[t-1,:]
            if(beat_arr[t]):
                diff_trans=dp[t-1,dp_max_at[t-1]]-(self.diff_trans_penalty if beat_arr[t]==1 else self.beat_trans_penalty[beat_arr[t]-2])
                use_same_trans=same_trans>diff_trans
                # dp[t-1,use_same_trans]=same_trans[use_same_trans]
                dp[t,:]=np.maximum(diff_trans,same_trans)+result_logprob[t,:]
                pre[t,:]=dp_max_at[t-1]
                pre[t,use_same_trans]=np.arange(n_chord)[use_same_trans]
            else:
                dp[t,:]=same_trans+result_logprob[t,:]
                pre[t,:]=np.arange(n_chord)
            dp_max_at[t]=np.argmax(dp[t,:])

            # Debug: Print dp state every 100 frames
            if t % 100 == 0:
                print(f"  Frame {t}: dp_max_at[{t}]: {dp_max_at[t]} (chord: {result_names[dp_max_at[t]]})")

        decode_ids=[None]*n_frame
        decode_ids[-1]=dp_max_at[-1]
        for t in range(n_frame-2,-1,-1):
            decode_ids[t]=pre[t+1,decode_ids[t+1]]

        # Debug: Print decode_ids
        print(f"  Final decode_ids (first few): {decode_ids[:10]}")
        print(f"  Unique decode_ids: {np.unique(decode_ids)}")

        # Convert decode_ids to chord names
        result = [result_names[i] for i in decode_ids]

        # Debug: Count chord types in result
        chord_counts = {}
        for chord in result:
            if chord in chord_counts:
                chord_counts[chord] += 1
            else:
                chord_counts[chord] = 1

        print("Chord counts in decode result:")
        for chord, count in chord_counts.items():
            print(f"  {chord}: {count}")

        return result

    def triad_decode(self,prob_list,beat_arr):
        result_array,triad_logprob=self.get_triad_bass_obs(prob_list)
        n_frame=triad_logprob.shape[0]
        n_chord=triad_logprob.shape[1]
        dp=np.zeros_like(triad_logprob)
        dp[0,1:]-=np.inf
        dp_max_at=np.zeros((n_frame),dtype=np.int32)
        pre=np.zeros_like(triad_logprob,dtype=np.int32)
        dp[0,:]+=triad_logprob[0,:]
        dp_max_at[0]=np.argmax(dp[0,:])
        pre[0,:]=-1
        for t in range(1,n_frame):
            same_trans=dp[t-1,:]
            if(beat_arr[t]>0):
                diff_trans=dp[t-1,dp_max_at[t-1]]-(self.diff_trans_penalty if beat_arr[t]==1 else self.beat_trans_penalty[beat_arr[t]-2])
                use_same_trans=same_trans>diff_trans
                # dp[t-1,use_same_trans]=same_trans[use_same_trans]
                dp[t,:]=np.maximum(diff_trans,same_trans)+triad_logprob[t,:]
                pre[t,:]=dp_max_at[t-1]
                pre[t,use_same_trans]=np.arange(n_chord)[use_same_trans]
            else:
                dp[t,:]=same_trans+triad_logprob[t,:]
                pre[t,:]=np.arange(n_chord)
            dp_max_at[t]=np.argmax(dp[t,:])
        decode_ids=[None]*n_frame
        decode_ids[-1]=dp_max_at[-1]
        for t in range(n_frame-2,-1,-1):
            decode_ids[t]=pre[t+1,decode_ids[t+1]]
        return [list(result_array[i]) for i in decode_ids]

    def layer_decode(self,prob_list,beat_arr):
        triad_restriction=self.triad_decode(prob_list,beat_arr)
        return self.decode(prob_list,beat_arr,triad_restriction)

    def __get_beat_arr(self,entry,length,use_beats,use_downbeats):
        delta_time=entry.prop.hop_length/entry.prop.sr
        beat_arr=np.ones((length,),dtype=np.int8)
        if(use_beats):
            valid_beats=[(int(np.round(token[0]/delta_time)),int(np.round(token[1]))) for token in entry.beat]
            valid_beats=[(token[0],token[1]) for token in valid_beats if token[0]>=0 and token[0]<beat_arr.shape[0]]
            for i in range(len(valid_beats)-1):
                beat_arr[valid_beats[i][0]+1:valid_beats[i+1][0]]=0
            if(use_downbeats and len(valid_beats)>0):
                num_beat_per_bar=np.max([token[1] for token in valid_beats])
                beat_arr[np.array([token[0] for token in valid_beats])]=4
                beat_arr[np.array([token[0] for token in valid_beats if token[1]==1])]=2
                if(num_beat_per_bar%2==0):
                    beat_arr[np.array([token[0] for token in valid_beats if token[1]==num_beat_per_bar//2+1])]=3
        return beat_arr

    def decode_to_chordlab(self,entry,prob_list,use_layer_decode,use_beats=False,use_downbeats=False):
        print("XHMMDecoder.decode_to_chordlab called")
        print(f"  use_layer_decode: {use_layer_decode}")
        print(f"  use_beats: {use_beats}")
        print(f"  use_downbeats: {use_downbeats}")

        # Debug: Check prob_list shapes
        print("Probability list shapes:")
        for i, prob in enumerate(prob_list):
            if prob is not None:
                print(f"  prob_list[{i}] shape: {prob.shape}")
                if i == 0:  # Triad probabilities
                    # Print top 5 triad probabilities for the first frame
                    top_indices = np.argsort(prob[0])[-5:][::-1]
                    print(f"  Top 5 triad probabilities (first frame):")
                    for idx in top_indices:
                        print(f"    Index {idx}: {prob[0][idx]:.6f}")
                    # Check if "N" chord (index 0) has high probability
                    print(f"    'N' chord (index 0) probability: {prob[0][0]:.6f}")
            else:
                print(f"  prob_list[{i}] is None")

        beat_arr=self.__get_beat_arr(entry,prob_list[0].shape[0],use_beats=use_beats,use_downbeats=use_downbeats)
        print(f"Beat array shape: {beat_arr.shape}, unique values: {np.unique(beat_arr)}")

        delta_time=entry.prop.hop_length/entry.prop.sr
        print(f"Delta time: {delta_time}")

        print("Calling decoder...")
        decode_tags=self.decode(prob_list,beat_arr) if not use_layer_decode else self.layer_decode(prob_list,beat_arr)

        # Debug: Print first few decode tags
        print("First few decode tags:")
        for i, tag in enumerate(decode_tags[:10]):
            print(f"  Tag {i}: {tag}")

        # Count chord types
        chord_counts = {}
        for tag in decode_tags:
            if tag in chord_counts:
                chord_counts[tag] += 1
            else:
                chord_counts[tag] = 1

        print("Chord counts:")
        for chord, count in chord_counts.items():
            print(f"  {chord}: {count}")

        result=[]
        last_frame=0
        n_frame=len(decode_tags)

        # If all tags are "N", just return the original result without modification
        all_n = all(tag == "N" for tag in decode_tags)
        if all_n:
            print("Warning: All chord tags are 'N'. Returning original model output.")
            # Just return the original result with a single "N" chord
            result.append([0.0, n_frame * delta_time, "N"])
            return result

        # Normal processing if not all "N"
        for i in range(n_frame):
            if(i+1==n_frame or decode_tags[i+1]!=decode_tags[i]):
                result.append([last_frame*delta_time,(i+1)*delta_time,decode_tags[i]])
                last_frame=i+1

        # Debug: Print result
        print("Final chord sequence (first few entries):")
        for i, chord in enumerate(result[:5]):
            print(f"  Chord {i}: {chord}")

        return result

    def decode_to_triad_chordlab(self,entry,prob_list,use_beats=False,use_downbeats=False):
        beat_arr=self.__get_beat_arr(entry,prob_list[0].shape[0],use_beats=use_beats,use_downbeats=use_downbeats)
        delta_time=entry.prop.hop_length/entry.prop.sr
        decode_tags=self.triad_decode(prob_list,beat_arr)
        result=[]
        last_frame=0
        n_frame=len(decode_tags)
        for i in range(n_frame):
            if(i+1==n_frame or decode_tags[i+1]!=decode_tags[i]):
                result.append([last_frame*delta_time,(i+1)*delta_time,decode_tags[i]])
                last_frame=i+1
        return decode_tags,result

    def decode_to_decoration_chordlab(self,entry,prob_list,triad_restriction,use_beats=False,use_downbeats=False):
        beat_arr=self.__get_beat_arr(entry,prob_list[0].shape[0],use_beats=use_beats,use_downbeats=use_downbeats)
        delta_time=entry.prop.hop_length/entry.prop.sr
        decode_tags=self.decode(prob_list,beat_arr,triad_restriction)
        result=[]
        last_frame=0
        n_frame=len(decode_tags)
        for i in range(n_frame):
            if(i+1==n_frame or decode_tags[i+1]!=decode_tags[i]):
                result.append([last_frame*delta_time,(i+1)*delta_time,decode_tags[i]])
                last_frame=i+1
        return decode_tags,result

def prob_to_spectrogram(prob_list,ref_chords):
    (result_triad,result_bass,result_7,result_9,result_11,result_13)=prob_list
    new_results=[]
    indices=ref_chords[:,0]>0
    for arr in [result_7,result_9,result_11,result_13]:
        new_result=np.zeros((arr.shape[0],arr.shape[2]))
        new_result[indices,:]=arr[np.arange(ref_chords.shape[0])[indices],(ref_chords[indices,0]-1).astype(np.int)%12,:]
        new_results.append(new_result)
    return np.concatenate((result_triad,result_bass,new_results[0],new_results[1],new_results[2],new_results[3]),
                          axis=1)

