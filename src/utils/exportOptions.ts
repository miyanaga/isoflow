import domtoimage from 'dom-to-image';
import FileSaver from 'file-saver';
import { Model, Size } from '../types';

export const generateGenericFilename = (extension: string) => {
  return `isoflow-export-${new Date().toISOString()}.${extension}`;
};

export const base64ToBlob = (
  base64: string,
  contentType: string,
  sliceSize = 512
) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });

  return blob;
};

export const downloadFile = (data: Blob, filename: string) => {
  FileSaver.saveAs(data, filename);
};

export const exportAsJSON = (model: Model) => {
  const data = new Blob([JSON.stringify(model)], {
    type: 'application/json;charset=utf-8'
  });

  downloadFile(data, generateGenericFilename('json'));
};

const cropTransparentRegionsFromDataURL = async (dataUrl: string, margin: number = 0, targetWidth?: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      // スキャンして透明でないピクセルの境界を見つける
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          const alpha = data[index + 3]; // アルファチャンネル

          if (alpha > 0) { // 透明でないピクセル
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // 透明でないピクセルが見つからない場合は元のデータURLを返す
      if (minX >= maxX || minY >= maxY) {
        resolve(dataUrl);
        return;
      }

      // マージンを適用した新しいキャンバスを作成
      const croppedWidth = maxX - minX + 1;
      const croppedHeight = maxY - minY + 1;
      let finalWidth = croppedWidth + margin * 2;
      let finalHeight = croppedHeight + margin * 2;

      // targetWidthが指定されている場合、スケーリングを計算
      let scale = 1;
      if (targetWidth && targetWidth > 0) {
        const widthWithoutMargin = targetWidth - (margin * 2);
        scale = widthWithoutMargin / croppedWidth;
        finalWidth = targetWidth;
        finalHeight = Math.round((croppedHeight * scale) + (margin * 2));
      }

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = finalWidth;
      croppedCanvas.height = finalHeight;

      const croppedCtx = croppedCanvas.getContext('2d');
      if (!croppedCtx) {
        resolve(dataUrl);
        return;
      }

      // 背景を透明にクリア
      croppedCtx.clearRect(0, 0, finalWidth, finalHeight);

      // アンチエイリアシングのためのスムージング設定
      croppedCtx.imageSmoothingEnabled = true;
      croppedCtx.imageSmoothingQuality = 'high';

      // クロップした領域をマージン分オフセットしてスケーリングして描画
      if (targetWidth) {
        croppedCtx.drawImage(
          canvas,
          minX, minY, croppedWidth, croppedHeight,
          margin, margin, croppedWidth * scale, croppedHeight * scale
        );
      } else {
        croppedCtx.drawImage(
          canvas,
          minX, minY, croppedWidth, croppedHeight,
          margin, margin, croppedWidth, croppedHeight
        );
      }

      // クロップしたキャンバスをdata URLに変換
      resolve(croppedCanvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
};

export const exportAsImage = async (el: HTMLDivElement, size?: Size, cropTransparent: boolean = true, margin: number = 0, targetWidth?: number) => {
  // まずdom-to-imageでPNGデータURLを取得
  const imageData = await domtoimage.toPng(el, {
    ...size,
    cacheBust: true
  });

  if (cropTransparent) {
    // 透明領域をクロップ（マージン付き、幅指定あり）
    return await cropTransparentRegionsFromDataURL(imageData, margin, targetWidth);
  } else {
    // crop無しでそのまま返す
    return imageData;
  }
};
