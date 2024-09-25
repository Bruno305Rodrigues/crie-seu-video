import { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';

const MAX_AUDIO_DURATION = 4 * 60; // 4 minutos em segundos

// Função para calcular a duração total do áudio
const getAudioDuration = (audioPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      (error, stdout) => {
        if (error) return reject(error);
        resolve(Number(stdout.trim()));
      }
    );
  });
};

// Função serverless principal
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verifique se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Usando formidable para processar o upload dos arquivos
  const form = new formidable.IncomingForm({ uploadDir: 'src/uploads', keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no upload de arquivos.' });
    }

    // Acessar as imagens e o áudio
    const images = Array.isArray(files.images) ? files.images : [files.images];
    const audio = Array.isArray(files.audio) ? files.audio[0] : files.audio; // Pega o primeiro arquivo se for um array

    if (!images.length || !audio) {
      return res.status(400).send('Imagens ou áudio ausente.');
    }

    // Obter os caminhos dos arquivos
    const imagePaths = images.map((file) => file?.filepath);
    const audioPath = audio.filepath; // Usar file.filepath para obter o caminho do áudio

    // Verifique se os arquivos existem
    if (!fs.existsSync(audioPath)) {
      return res.status(400).send('Arquivo de áudio não encontrado.');
    }

    // Calcular a duração do áudio
    let audioDuration: number;
    try {
      audioDuration = await getAudioDuration(audioPath);
      if (audioDuration > MAX_AUDIO_DURATION) {
        return res.status(400).send('O áudio não pode ter mais de 4 minutos.');
      }
    } catch (error) {
      return res.status(500).send('Erro ao obter a duração do áudio.');
    }

    // Calcular o tempo de exibição para cada imagem
    const imageDisplayTime = audioDuration / imagePaths.length;

    // Comando para criar o vídeo
    let ffmpegCommand = `ffmpeg -y -i "${audioPath}"`;

    imagePaths.forEach((image) => {
      ffmpegCommand += ` -loop 1 -t ${imageDisplayTime} -i "${image}"`;
    });

    let filterComplex = '"';
    for (let i = 0; i < imagePaths.length; i++) {
      filterComplex += `[${i + 1}:v]fade=t=in:st=0:d=1,fade=t=out:st=${imageDisplayTime - 1}:d=1[v${i}];`;
    }

    filterComplex += `${imagePaths.map((_, i) => `[v${i}]`).join('')}concat=n=${imagePaths.length}:v=1:a=0,format=yuv420p[v]"`;

    ffmpegCommand += ` -filter_complex ${filterComplex} -map "[v]" -map 0:a -c:v libx264 -c:a aac "src/output/output.mp4"`;

    exec(ffmpegCommand, (error) => {
      if (error) {
        return res.status(500).send('Erro ao criar o vídeo.');
      }

      const outputFilePath = path.join(process.cwd(), 'src/output', 'output.mp4');

      // Enviar o arquivo como resposta
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="output.mp4"');

      const fileStream = fs.createReadStream(outputFilePath);
      fileStream.pipe(res);

      // Limpar diretórios após envio
      fileStream.on('close', () => {
        clearDirectory('src/uploads/');
        clearDirectory('src/output/');
      });
    });
  });
}

// Função para limpar diretórios
const clearDirectory = (dirPath: string) => {
  fs.readdir(dirPath, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  });
};
