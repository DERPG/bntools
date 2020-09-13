import React from "react"

class Data {
  array: Uint8Array;

  constructor(array: Uint8Array) {
    this.array = array;
  }

  read_8(address) {
    return this.array[address];
  }

  read_16(address) {
    return this.array[address] + (this.array[address + 1] << 8);
  }
}

class Palette {
  array: any;

  constructor(array: any) {
    this.array = array;
  }

  value(index) {
    return this.array[index];
  }

  high(index) {
    const color = this.value(index);
    const r = color & 0x1f;
    const g = (color & 0x3e0) >> 5;
    const b = (color & 0x7c00) >> 10;
    return [r, g, b];
  }

  true(index) {
    return this.high(index).map(x => x * 8);
  }
}

class SpriteExporter extends React.Component {
  private canvasRef: React.RefObject<HTMLCanvasElement>

  constructor(props) {
    super(props);
    this.state = {
      image: null
    };

    this.canvasRef = React.createRef();

    this.loadFile = this.loadFile.bind(this);
    this.load = this.load.bind(this);
  }

  loadFile(event) {
    console.log('loaded file');

    const reader = new FileReader();
    reader.readAsArrayBuffer(event.target.files[0]);
    reader.onloadend = (ev) => {
      const array = new Uint8Array(ev.target.result);
      const data = new Data(array);

      this.load(data);
    };
  }

  load(data: Data) {
    const PALETTE_BASE_ADDRESS = 0x3cace4;
    const buffer = new Array(16);
    for (let i = 0; i < 16; i++) {
      buffer[i] = data.read_16(PALETTE_BASE_ADDRESS + i * 2);
    }

    const palette = new Palette(buffer);

    const ctx = this.canvasRef.current.getContext('2d');

    // const imageData = ctx.getImageData(0, 0, 256, 16);
    // for (let i = 0; i < 16; i++) {
    //   for (let x = 0; x < 16; x++) {
    //     for (let y = 0; y < 16; y++) {
    //       const idx = (y * 256 + (16 * i + x)) * 4;
    //       imageData.data[idx] = palette.true(i)[0];
    //       imageData.data[idx + 1] = palette.true(i)[1];
    //       imageData.data[idx + 2] = palette.true(i)[2];
    //       imageData.data[idx + 3] = 0xff;
    //     }
    //   }
    //   console.log(palette.high(i));
    // }
    // ctx.putImageData(imageData, 0, 0);

    const base = 0x3c0798;
    for (let t = 0; t < 10; t++) {
      const imageData = ctx.getImageData(t * 8 % 16, Math.floor(t / 2) * 8, 8, 8);

      for (let i = 0; i < 0x20; i++) {
        const byte = data.read_8(base + t * 0x20 + i);
        const p1 = palette.true(byte & 0x0F);
        const p2 = palette.true((byte & 0xF0) >> 4);

        let l = i * 8;
        imageData.data[l + 0] = p1[0];
        imageData.data[l + 1] = p1[1];
        imageData.data[l + 2] = p1[2];
        imageData.data[l + 3] = 0xff;

        imageData.data[l + 4] = p2[0];
        imageData.data[l + 5] = p2[1];
        imageData.data[l + 6] = p2[2];
        imageData.data[l + 7] = 0xff;
      }

      ctx.putImageData(imageData, t * 8 % 16, Math.floor(t / 2) * 8);
    }

    console.log('loaded palette');
  }

  render() {
    return (
      <div>
        <h2>Sprite exporter</h2>
        <input type="file" onChange={this.loadFile} />
        <canvas ref={this.canvasRef} width={256} height={64} />
      </div>
    );
  }
}

export default SpriteExporter
