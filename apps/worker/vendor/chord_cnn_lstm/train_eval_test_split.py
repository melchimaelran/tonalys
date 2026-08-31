"""Stub replacement for the upstream `train_eval_test_split.py`.

The real file reads `data/all_1217.csv` + 10 train/test/val fold CSVs at
*import time* to build training-split lookup tables — dead weight for
inference-only use (chordnet_ismir_naive.py imports these 3 names
unconditionally but chord_recognition() never calls them). Vendoring 10
training-split CSVs just to satisfy an unused import isn't worth it, so
this stub keeps the same public names with no-op bodies instead. See
apps/worker/vendor/chord_cnn_lstm/README.md.
"""

import numpy as np


def get_train_set_ids(fold):
    return np.array([], dtype=int)


def get_val_set_ids(fold):
    return np.array([], dtype=int)


def get_test_set_ids(fold):
    return np.array([], dtype=int)


def get_test_fold_by_name(entry_name):
    return -1
