import React, { useState } from 'react';

const App: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImages(Array.from(event.target.files));
    }
  };

  const handleAudioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAudio(event.target.files[0]);
    }
  };

  const createVideo = async () => {
    setLoading(true);
    setErrorMessage('');
    const formData = new FormData();
    images.forEach((image) => formData.append('images', image));
    if (audio) {
      formData.append('audio', audio);
    }

    try {
      const response = await fetch('/create-video', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Limpar os campos após o download
        setImages([]);
        setAudio(null);
        (document.getElementById('image-input') as HTMLInputElement).value = '';
        (document.getElementById('audio-input') as HTMLInputElement).value = '';
      } else {
        const errorText = await response.text();
        setErrorMessage(`Erro ao criar o vídeo: ${errorText}`);
      }
    } catch (error) {
      setErrorMessage(`Erro ao criar o vídeo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '20px' }}>Criar Vídeo Personalizado</h1>
      <p>Selecione imagens (formatos aceitos: .jpg, .png, .jpeg) e um arquivo de áudio (máximo de 4 minutos).</p>
      
      <input id="image-input" type="file" onChange={handleImageChange} multiple accept="image/*" style={{ margin: '10px' }} />
      <input id="audio-input" type="file" onChange={handleAudioChange} accept="audio/*" style={{ margin: '10px' }} />

      <button
        onClick={createVideo}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ddd' : '#28a745',
          color: '#fff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          margin: '10px',
        }}
      >
        {loading ? 'Processando vídeo...' : 'Criar Vídeo'}
      </button>

      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      <div style={{ marginTop: '40px', textAlign: 'left', maxWidth: '800px', margin: 'auto' }}>
        <h2>Sobre o site</h2>
        <p>
          Este site permite que você crie vídeos personalizados combinando imagens e áudio em um único arquivo de vídeo.
          Basta selecionar uma sequência de imagens e um arquivo de áudio de até 4 minutos. O sistema irá processar as imagens,
          aplicar efeitos de fade-in e fade-out, e sincronizar com o áudio selecionado.
        </p>
        <p>
          Você pode usar este serviço para criar vídeos para diversos fins, como apresentações de fotos com música de fundo,
          pequenos vídeos de lembranças ou mesmo para compartilhar eventos especiais com seus amigos e familiares.
        </p>
        <p>
          O processo de criação de vídeos é simples: selecione as imagens e o áudio, clique em "Criar Vídeo" e aguarde enquanto
          o sistema processa o conteúdo. Após a finalização, você poderá baixar o vídeo diretamente para o seu dispositivo.
        </p>
        <p>
          Lembre-se: o arquivo de áudio deve ter no máximo 4 minutos. Se o áudio for maior, o sistema não permitirá o envio.
          Para garantir a melhor experiência, use imagens nos formatos .jpg, .png ou .jpeg, e siga as instruções para garantir
          que o vídeo seja gerado corretamente.
        </p>
      </div>
    </div>
  );
};

export default App;
