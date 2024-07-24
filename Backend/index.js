const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');
const { PythonShell } = require('python-shell');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OpenAI_KEY });

let pdfContent = '';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

app.post('/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    try {
        const data = await pdf(dataBuffer);
        pdfContent = data.text;
        res.json({ message: 'PDF uploaded and processed successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Error processing PDF' });
    }
});

app.post('/ask', async (req, res) => {
    const question = req.body.question;
    if (!question) {
        return res.status(400).json({ error: 'No question provided.' });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant. Answer the question based on the following context." },
                { role: "user", content: `Context: ${pdfContent}\n\nQuestion: ${question}` }
            ],
        });

        res.json({ answer: completion.choices[0].message.content, source: 'openai' });
    } catch (error) {
        console.error('Error generating answer:', error);
        
        // Use Python fallback method
        try {
            const options = {
                mode: 'json',
                pythonPath: 'python', // or 'python3' depending on your system
                scriptPath: __dirname,
                args: [JSON.stringify({ context: pdfContent, question: question })]
            };

            PythonShell.run('advanced_qa.py', options).then(results => {
                const answer = results[0].answer;
                res.json({ answer: answer, source: 'python-fallback' });
            });
        } catch (pythonError) {
            console.error('Error in Python fallback:', pythonError);
            res.status(500).json({ error: 'Error generating answer', details: pythonError.message });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));