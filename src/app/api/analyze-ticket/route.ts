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

    // Usar Gemini 1.5 Flash (ideal para OCR rápido y barato)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent([prompt, ...imageParts]);
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
