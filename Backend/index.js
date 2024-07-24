const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const dotenv=require('dotenv');
const cors = require('cors'); 
const bodyParser = require('body-parser');


dotenv.config(); 

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))


// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OpenAI_KEY });

let pdfContent = '';

app.use(express.json());
app.use(express.static('public'));

// const corsOptions = {
//     origin: 'http://127.0.0.1:3000',  // or the specific origin you want to allow
//     optionsSuccessStatus: 200
//   };
//   app.use(cors(corsOptions));
app.post('/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    try {
        const data = await pdf(dataBuffer);
        pdfContent = data.text;
        res.send('PDF uploaded and processed successfully.');
    } catch (error) {
        res.status(500).send('Error processing PDF');
    }
});

app.post('/ask', async (req, res) => {
    const question = req.body.question;
    console.log("hit");
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

        res.json({ answer: completion.choices[0].message.content });
    } catch (error) {
        console.error('Error generating answer:', error);
        res.status(500).json({ error: 'Error generating answer', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));