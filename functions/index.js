// functions/index.js
const functions = require("firebase-functions");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Store your key securely! Run this in your terminal:
// firebase functions:config:set gemini.key="YOUR_REAL_GEMINI_API_KEY"
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);

exports.callGeminiApi = functions.https.onCall(async (data, context) => {
  // 2. Check if the user is logged in
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to use this feature."
    );
  }

  const { systemPrompt, userQuery } = data;
  if (!userQuery) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'userQuery'."
    );
  }

  try {
    // 3. Call the Gemini API from the server
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // or any model you prefer
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userQuery);
    const response = result.response;

    // 4. Send the text response back to the frontend
    return { text: response.text() };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new functions.https.HttpsError("internal", "Error calling Gemini API.");
  }
});