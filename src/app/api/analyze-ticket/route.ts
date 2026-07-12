import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Iniciar el cliente de Gemini con la llave del entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { base64Image, mimeType } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No se ha configurado GEMINI_API_KEY en el entorno' }, { status: 500 });
    }

    let modelName = "gemini-1.5-flash";
    let model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Eres un asistente experto en contabilidad.
Analiza la siguiente imagen de un recibo o ticket de compra.
Extrae la siguiente información:
1. El proveedor o nombre de la tienda (description).
2. El monto total de la compra (amount), solo el número decimal, sin símbolos de moneda.

Responde ÚNICAMENTE en formato JSON estricto con esta estructura, no uses bloques de código (markdown), solo el JSON crudo:
{
  "description": "Nombre de la Tienda",
  "amount": 123.45
}
Si no puedes detectar la información, devuelve "Desconocido" y 0 respectivamente.
`;

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType || 'image/jpeg'
        }
      }
    ];

    let result;
    try {
      result = await model.generateContent([prompt, ...imageParts]);
    } catch (fallbackError: any) {
      if (fallbackError.message?.includes('404')) {
        console.log("Model not found. Discovering available models...");
        // Auto-discover available models
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          // Find the first model that supports vision/generateContent
          const availableModels = modelsData.models || [];
          const visionModel = availableModels.find((m: any) => 
            m.supportedGenerationMethods.includes('generateContent') && 
            (m.name.includes('flash') || m.name.includes('pro')) &&
            !m.name.includes('vision') // older vision model might be broken
          );
          
          if (visionModel) {
            modelName = visionModel.name.replace('models/', '');
            console.log("Auto-discovered model:", modelName);
            model = genAI.getGenerativeModel({ model: modelName });
            result = await model.generateContent([prompt, ...imageParts]);
          } else {
            // Fallback to a hardcoded newer model if discovery fails finding a good one
            modelName = "gemini-2.0-flash";
            model = genAI.getGenerativeModel({ model: modelName });
            result = await model.generateContent([prompt, ...imageParts]);
          }
        } else {
          throw fallbackError;
        }
      } else {
        throw fallbackError;
      }
    }

    const responseText = result.response.text();
    
    // Limpiar posible formato markdown que regrese Gemini
    const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      console.error("Error parseando JSON de Gemini:", cleanText);
      return NextResponse.json({ error: 'La respuesta de la IA no pudo ser procesada', details: cleanText }, { status: 500 });
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Error en analyze-ticket:", error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
