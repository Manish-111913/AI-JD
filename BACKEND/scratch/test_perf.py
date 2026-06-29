import time
import torch
import numpy as np
from sentence_transformers import SentenceTransformer

def run_benchmark():
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    print("Loading model...")
    model = SentenceTransformer(model_name)
    print("Model loaded.")

    # Create dummy candidate texts
    # 1. Long text (similar to current build_candidate_text)
    long_text = "Senior Software Engineer. Shipped scale backend products to production. " * 15
    # 2. Optimized text (truncated to fit 256-token limit)
    short_text = "Senior Software Engineer. Shipped scale backend products to production. " * 8

    print(f"Long text length (chars): {len(long_text)}")
    print(f"Short text length (chars): {len(short_text)}")

    num_samples = 1000
    long_inputs = [long_text] * num_samples
    short_inputs = [short_text] * num_samples

    # Test configurations
    configs = [
        # (num_threads, batch_size, use_short_text)
        (8, 256, False),
        (8, 256, True),
        (4, 256, True),
        (2, 256, True),
        (1, 256, True),
        (4, 512, True),
        (4, 128, True),
    ]

    print("\nStarting Benchmark (1,000 samples per run):\n")
    print(f"{'Threads':<10}{'Batch Size':<12}{'Text Type':<12}{'Time (s)':<12}{'Samples/Sec':<15}")
    print("-" * 65)

    for threads, batch_size, use_short in configs:
        torch.set_num_threads(threads)
        inputs = short_inputs if use_short else long_inputs
        text_type = "Short" if use_short else "Long"
        
        # Warmup
        model.encode(inputs[:10], batch_size=batch_size, show_progress_bar=False)
        
        # Measure
        start = time.time()
        model.encode(inputs, batch_size=batch_size, show_progress_bar=False)
        elapsed = time.time() - start
        
        rate = num_samples / elapsed
        print(f"{threads:<10}{batch_size:<12}{text_type:<12}{elapsed:<12.2f}{rate:<15.1f}")

if __name__ == "__main__":
    run_benchmark()
