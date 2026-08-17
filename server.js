const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "10mb" }));

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/chat", async (req, res) => {
    try {
        const messages = req.body.messages || [];
        const language = req.body.language || "da";

        let instruction = "Svar altid på dansk.";

        if (language === "en") {
            instruction = "Always answer in English.";
        }

        if (language === "no") {
            instruction = "Svar alltid på norsk.";
        }

        const conversation = messages
            .map(function (message) {
                if (message.role === "user") {
                    return "Bruger: " + message.content;
                }

                if (message.role === "assistant") {
                    return "Radium: " + message.content;
                }

                return "";
            })
            .filter(Boolean)
            .join("\n\n");

        const response = await client.responses.create({
            model: "gpt-5",
            instructions: instruction,
            input: conversation + "\n\nSvar på den seneste besked.",
            stream: true
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const event of response) {
            if (event.type === "response.output_text.delta") {
                const data = JSON.stringify({
                    text: event.delta
                });

                res.write("data: " + data + "\n\n");
            }

            if (event.type === "response.completed") {
                res.write("data: [DONE]\n\n");
            }
        }

        res.end();

    } catch (error) {
        console.error(error);

        if (!res.headersSent) {
            res.status(500).json({
                error: error.message
            });
        } else {
            res.write(
                "data: " +
                JSON.stringify({
                    error: error.message
                }) +
                "\n\n"
            );

            res.end();
        }
    }
});

app.use(express.static("."));

app.listen(3000, function () {
    console.log("Radium kører på http://localhost:3000");
});