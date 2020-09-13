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

  constructor(tilemap: Tilemap, palette: Palette) {
    this.tilemap = tilemap;
    this.palette = palette;
  }
}

class Tilemap {
  tiles: number[][];

  constructor(tiles: number[][]) {
    this.tiles = tiles;
  }
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
    const ptr4 = cursor.read32();
    const animationDelay = cursor.read8();
    cursor.read8(); // 0x00
    const end = cursor.read8();
    cursor.read8(); // 0x00

    cursor.setCursor(tilemapPointer);
    const tilemap = readTilemap(cursor);

    cursor.setCursor(palettePointer);
    const palette = readPalette(cursor);

    frames[i] = new Frame(tilemap, palette);
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

    frames.forEach((frame, y) => {
      frame.tilemap.tiles.forEach((tile, xi) => {
        const imageData = ctx.getImageData(xi * 8, y * 8, 8, 8);
        const palette = frame.palette;
        for (let p = 0; p < 64; p++) {
          const bi = p * 4;
          const color = palette.true(tile[p]);
          imageData.data[bi] = color[0];
          imageData.data[bi+1] = color[1];
          imageData.data[bi+2] = color[2];
          imageData.data[bi+3] = 0xff;
        }

        ctx.putImageData(imageData, xi * 8, y * 8);
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
        <canvas ref={this.canvasRef} width={8 * 32} height={8 * 64} />
      </div>
    );
  }
}

export default SpriteExporter
