export function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("בחר קובץ תמונה"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1200;
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const width = Math.round(image.width * ratio);
        const height = Math.round(image.height * ratio);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("לא הצלחתי לעבד את התמונה"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("לא הצלחתי לקרוא את התמונה"));
      image.src = String(reader.result ?? "");
    };

    reader.onerror = () => reject(new Error("לא הצלחתי לקרוא את הקובץ"));
    reader.readAsDataURL(file);
  });
}
