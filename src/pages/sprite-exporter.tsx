import React, { ChangeEvent } from "react"

class Data {
  private array: Uint8Array;

  constructor(array: Uint8Array) {
    this.array = array;
  }

  read8(address): number {
    return this.array[address];
  }

  read16(address): number {
    return this.array[address] + (this.array[address + 1] << 8);
  }

  read32(address): number {
    return this.array[address] + (this.array[address + 1] << 8) + (this.array[address + 2] << 16) + (this.array[address + 3] << 24);
  }
}

class DataReader {
  private data: Data;
  private cursor: number;
  private base: number;

  constructor(data: Data) {
    this.data = data;
    this.cursor = 0;
    this.base = 0;
  }

  reset(newBase: number, newCursor: number): void {
    this.base = newBase;
    this.cursor = newCursor;
  }

  setCursor(newCursor: number): void {
    this.cursor = newCursor;
  }

  read8(): number {
    const ret = this.data.read8(this.base + this.cursor);
    this.cursor += 1;
    return ret;
  }

  read16(): number {
    const ret = this.data.read16(this.base + this.cursor);
    this.cursor += 2;
    return ret;
  }

  read32(): number {
    const ret = this.data.read32(this.base + this.cursor);
    this.cursor += 4;
    return ret;
  }
}

class Sprite {
  animations: Animation[];
}

class Animation {
  frames: Frame[];
}

class Frame {
  tilemap: Tilemap;
  palette: Palette;
  oams: Oam[];

  constructor(tilemap: Tilemap, palette: Palette, oams: Oam[]) {
    this.tilemap = tilemap;
    this.palette = palette;
    this.oams = oams;
  }
}

class Tilemap {
  tiles: number[][];

  constructor(tiles: number[][]) {
    this.tiles = tiles;
  }
}

class OamSize {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  total() {
    return this.width * this.height;
  }
}

const oamSizes: OamSize[] = [
  new OamSize(1, 1),
  new OamSize(2, 2),
  new OamSize(4, 4),
  new OamSize(8, 8),
  new OamSize(2, 1),
  new OamSize(4, 1),
  new OamSize(4, 2),
  new OamSize(8, 2),
  new OamSize(1, 2),
  new OamSize(1, 4),
  new OamSize(2, 4),
  new OamSize(4, 8)
];

interface Oam {
  startTile: number;
  offsetX: number;
  offsetY: number;
  size: OamSize;
  hflip: boolean;
  vflip: boolean;
}

class Palette {
  private array: any;

  constructor(array: any) {
    this.array = array;
  }

  value(index): number {
    return this.array[index];
  }

  high(index): number[] {
    const color = this.value(index);
    const r = color & 0x1f;
    const g = (color & 0x3e0) >> 5;
    const b = (color & 0x7c00) >> 10;
    return [r, g, b];
  }

  true(index): number[] {
    return this.high(index).map(x => x * 8);
  }
}

function toHex(value: number): string {
  return value.toString(16);
}

function readSprite(data: Data, address: number): Frame[] {
  const cursor = new DataReader(data);
  cursor.setCursor(address);

  cursor.read8();
  cursor.read8(); // 0x00
  cursor.read8(); // 0x01
  const animationCount = cursor.read8();
  
  const animationPointers = new Array(animationCount);
  const animations = new Array(animationCount);
  const frames = new Array(256);

  cursor.reset(address + 0x04, 0x00);

  for (let i = 0; i < animationCount; i++) {
    animationPointers[i] = cursor.read32();
  }

  for (let i = 0; i < animationCount; i++) {
    cursor.setCursor(animationPointers[i]);
    const tilemapPointer = cursor.read32();
    const palettePointer = cursor.read32();
    const ptr3 = cursor.read32();
    const oamPointer = cursor.read32();
    const animationDelay = cursor.read8();
    cursor.read8(); // 0x00
    const end = cursor.read8();
    cursor.read8(); // 0x00

    cursor.setCursor(tilemapPointer);
    const tilemap = readTilemap(cursor);

    cursor.setCursor(palettePointer);
    const palette = readPalette(cursor);

    cursor.setCursor(oamPointer);
    const oams = readOams(cursor);

    frames[i] = new Frame(tilemap, palette, oams);
  }

  return frames;
}

function readTilemap(reader: DataReader): Tilemap {
  const size = reader.read32();
  const tilesCount = size / 0x20; // 0x20 is the byte size of an 8x8 tile == 32 bytes
  const tiles = new Array(tilesCount);

  for (let i = 0; i < tilesCount; i++) {
    // read a tile
    const tile = new Array(64); // for convenience we're unpacking the bits
    for (let i = 0; i < 0x20; i++) {
      const byte = reader.read8();
      const first = byte & 0x0f;
      const second = (byte & 0xf0) >> 4;
      tile[i*2] = first;
      tile[i*2+1] = second;
    }
    tiles[i] = tile;
  }

  return new Tilemap(tiles);
}

function readPalette(reader: DataReader): Palette {
  const size = reader.read32(); // always 0x20 == 32 bytes. 2 bytes per entry
  const palette = new Array(16);

  for (let i = 0; i < 16; i++) {
    palette[i] = reader.read16();
  }

  return new Palette(palette);
}

function readOams(reader: DataReader): Oam[] {
  const oams: Oam[] = [];
  const start = reader.read32() - 4;

  // skip enough bytes
  for (let i = 0; i < start; i++) {
    reader.read8();
  }

  while (true) {
    const startTile = reader.read8();
    const offsetX = reader.read8();
    const offsetY = reader.read8();
    const size = reader.read8();
    const shape = reader.read8();

    if (startTile === 0xff && offsetX === 0xff && offsetY === 0xff && size === 0xff && shape === 0xff) {
      break;
    }

    const oamSize = oamSizes[((shape & 0x3) << 2) + (size & 0x3)];
    const hflip = (size & 0x40) > 0;
    const vflip = (size & 0x20) > 0;

    const oam: Oam = {
      startTile,
      offsetX,
      offsetY,
      hflip,
      vflip,
      size: oamSize
    };

    oams.push(oam);
  }

  return oams;
}

class SpriteExporter extends React.Component {
  private canvasRef: React.RefObject<HTMLCanvasElement>;
  private data: Data;

  constructor(props) {
    super(props);
    this.state = {
      image: null
    };

    this.canvasRef = React.createRef();

    this.loadFile = this.loadFile.bind(this);
    this.load = this.load.bind(this);
    this.readSprite = this.readSprite.bind(this);
  }

  loadFile(event: ChangeEvent<HTMLInputElement>) {
    console.log('loaded file');

    const reader = new FileReader();
    reader.readAsArrayBuffer(event.target.files[0]);
    reader.onloadend = (ev) => {
      const array = new Uint8Array(ev.target.result as ArrayBuffer);
      const data = new Data(array);
      this.data = data;

      this.load(0x3bf284);
    };
  }

  load(address: number) {
    const canvas = this.canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frames = readSprite(this.data, address);

    frames.forEach((frame, f) => {
      // frame.tilemap.tiles.forEach((tile, xi) => {
      //   const imageData = ctx.getImageData(xi * 8, y * 8, 8, 8);
      //   const palette = frame.palette;
        // for (let p = 0; p < 64; p++) {
        //   const bi = p * 4;
        //   const color = palette.true(tile[p]);
        //   imageData.data[bi] = color[0];
        //   imageData.data[bi+1] = color[1];
        //   imageData.data[bi+2] = color[2];
        //   imageData.data[bi+3] = 0xff;
        // }

      //   ctx.putImageData(imageData, xi * 8, y * 8);
      // });

      const palette = frame.palette;

      frame.oams.forEach((oam) => {
        console.log(oam);
        let tox = 0;
        let toy = 0;

        let x = 0, y = 0;
        if (oam.offsetX <= 0x7f) {
          x = 128 + oam.offsetX;
        } else {
          x = oam.offsetX - 128;
        }

        if (oam.offsetY <= 0x7f) {
          y = 128 + oam.offsetY;
        } else {
          y = oam.offsetY - 128;
        }

        const canvasX = x + tox * 8 + (f % 8) * 64;
        const canvasY = y + Math.floor(f / 8) * 64 + toy * 8;
        const imageData = ctx.getImageData(canvasX, canvasY, oam.size.width * 8, oam.size.height * 8);

        const pixels = new Array(oam.size.width * 8 * oam.size.height * 8);

        for (let t = 0; t < oam.size.total(); t++) {
          const tile = oam.startTile + t;

          for (let ly = 0; ly < 8; ly++) {
            for (let lx = 0; lx < 8; lx++) {
              const i = ((toy * 8 + ly) * oam.size.width * 8 + (tox * 8 + lx));
              const pi = frame.tilemap.tiles[tile][ly * 8 + lx];
              if (pi !== 0) {
                pixels[i] = palette.true(pi);
              }
            }
          }

          tox ++;
          if (tox >= oam.size.width) {
            toy ++;
            tox = 0;
          }
        }

        if (oam.hflip) {
          const w = oam.size.width * 8;
          for (let i = 0; i < oam.size.height * 8; i++) {
            const offset = i * w;
            for (let j = 0; j < w / 2; j++) {
              const t = pixels[offset + j];
              pixels[offset + j] = pixels[offset + (w - 1 - j)];
              pixels[offset + (w - 1 - j)] = t;
            }
          }
        }

        for (let i = 0; i < pixels.length; i++) {
          const idx = i * 4;
          const pixel = pixels[i];
          if (pixel) {
            imageData.data[idx] = pixel[0];
            imageData.data[idx+1] = pixel[1];
            imageData.data[idx+2] = pixel[2];
            imageData.data[idx+3] = 0xff;
          }
        }

        ctx.putImageData(imageData, canvasX, canvasY);
      });

    });
  }

  readSprite(event) {
    const value = event.target.value;
    const address = this.data.read32(0x31ea8 + value * 4) & 0xffffff;

    this.load(address);
  }

  render() {
    return (
      <div>
        <h2>Sprite exporter</h2>
        <input type="file" onChange={this.loadFile} />
        <input type="number" onChange={this.readSprite} defaultValue={0} />
        <canvas ref={this.canvasRef} width={8 * 128} height={8 * 64} />
      </div>
    );
  }
}

export default SpriteExporter;
