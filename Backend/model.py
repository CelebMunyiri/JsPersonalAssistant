import sys
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.tokenize import sent_tokenize

# Download necessary NLTK data
nltk.download('punkt', quiet=True)

def preprocess_text(text):
    # Tokenize the text into sentences
    sentences = sent_tokenize(text)
    return sentences

def answer_question(context, question):
    # Preprocess the context
    sentences = preprocess_text(context)
    
    # Add the question to the sentences for vectorization
    sentences.append(question)
    
    # Create TF-IDF vectorizer
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(sentences)
    
    # Calculate cosine similarity
    similarity_scores = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1])
    
    # Get the index of the most similar sentence
    most_similar_index = similarity_scores.argmax()
    
    # Return the most similar sentence as the answer
    return sentences[most_similar_index]

if __name__ == "__main__":
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    context = input_data['context']
    question = input_data['question']
    
    # Generate answer
    answer = answer_question(context, question)
    
    # Print the answer as JSON to stdout
    print(json.dumps({'answer': answer}))