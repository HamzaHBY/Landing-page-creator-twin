/**
 * Twin Studio uploads every image to fal.media via their `uploadImageToFal`
 * helper before sending it to the model. For our clone we do the simplest
 * useful thing: hand back the data URL directly. The API route on the server
 * side then either uploads it to OpenAI or forwards the URL to fal.ai.
 *
 * If FAL_KEY is exposed via window.__falKey we route through fal.ai instead.
 */
export async function uploadImageFile(file: File | Blob, name?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : '');
    fr.onerror = () => reject(fr.error || new Error('failed to read file'));
    fr.readAsDataURL(file);
  });
}
