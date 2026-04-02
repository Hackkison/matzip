// 브라우저 Canvas API로 이미지 리사이즈 후 WebP 변환
export async function resizeToWebP(file: File, maxPx = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let w = img.naturalWidth
      let h = img.naturalHeight

      // 장변 기준으로 maxPx 이하로 축소
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx }
        else { w = Math.round(w * maxPx / h); h = maxPx }
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('이미지 변환 실패')),
        'image/webp',
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('이미지 로드 실패')) }
    img.src = objectUrl
  })
}
