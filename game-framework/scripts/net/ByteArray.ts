function error (code): void {
    throw new Error("#" + code);//使用这种方式报错能够终止后续代码继续运行
}

export class Endian {
    /**
     * 表示多字节数字的最低有效字节位于字节序列的最前面。
     * 十六进制数字 0x12345678 包含 4 个字节（每个字节包含 2 个十六进制数字）。最高有效字节为 0x12。最低有效字节为 0x78。（对于等效的十进制数字 305419896，最高有效数字是 3，最低有效数字是 6）。
     */
    public static LITTLE_ENDIAN: string = "littleEndian";

    /**
     * 表示多字节数字的最高有效字节位于字节序列的最前面。
     * 十六进制数字 0x12345678 包含 4 个字节（每个字节包含 2 个十六进制数字）。最高有效字节为 0x12。最低有效字节为 0x78。（对于等效的十进制数字 305419896，最高有效数字是 3，最低有效数字是 6）。
     */
    public static BIG_ENDIAN: string = "bigEndian";
}

export class ByteArray {

    protected bufferExtSize = 0;

    protected data: DataView;

    protected _bytes: Uint8Array;
    
    protected _position: number;

    /**
     * 已经使用的字节偏移量
     */
    protected write_position: number;

    /**
     * 更改或读取数据的字节顺序
     */
    public get endian() {
        return this.$endian == 0 ? Endian.LITTLE_ENDIAN : Endian.BIG_ENDIAN;
    }

    public set endian(value: string) {
        this.$endian = value == Endian.LITTLE_ENDIAN ? 0 : 1;
    }

    protected $endian: number;

    constructor (buffer?: ArrayBuffer | Uint8Array, bufferExtSize = 0) {
        if (bufferExtSize < 0)
            bufferExtSize = 0;
        
        this.bufferExtSize = bufferExtSize;
        let bytes: Uint8Array, wpos = 0;
        if (buffer) {//有数据，则可写字节数从字节尾开始
            let uint8: Uint8Array;
            if (buffer instanceof Uint8Array) {
                uint8 = buffer;
                wpos = buffer.length;
            } else {
                wpos = buffer.byteLength;
                uint8 = new Uint8Array(buffer);
            }
            if (bufferExtSize == 0) {
                bytes = new Uint8Array(wpos);
            } else {
                let multi = (wpos / bufferExtSize | 0) + 1;
                bytes = new Uint8Array(multi * bufferExtSize);
            }
            bytes.set(uint8);
        } else {
            bytes = new Uint8Array(bufferExtSize);
        }
        this.write_position = wpos;
        this._position = 0;
        this._bytes = bytes;
        this.data = new DataView(bytes.buffer);
        this.endian = Endian.BIG_ENDIAN;
    }

    /**
     * 可读的剩余字节
     */
    public get readAvailable() {
        return this.write_position - this._position;
    }

    public get buffer(): ArrayBuffer {
        return this.data.buffer.slice(0, this.write_position);
    }

    public get rawBuffer(): ArrayBuffer {
        return this.data.buffer;
    }

    public set buffer(value: ArrayBuffer) {
        let wpos = value.byteLength;
        let uint8 = new Uint8Array(value);
        let bufferExtSize = this.bufferExtSize;
        let bytes: Uint8Array;
        if (bufferExtSize == 0) {
            bytes = new Uint8Array(wpos);
        } else {
            let multi = (wpos / bufferExtSize | 0) + 1;
            bytes = new Uint8Array(multi * bufferExtSize);
        }
        bytes.set(uint8);
        this.write_position = wpos;
        this._bytes = bytes;
        this.data = new DataView(bytes.buffer);
    }

    public get bytes(): Uint8Array {
        return this._bytes;
    }

    public get dataView(): DataView {
        return this.data;
    }

    public set dataView(value: DataView) {
        this.buffer = value.buffer;
    }

    public get bufferOffset(): number {
        return this.data.byteOffset;
    }

    /**
     * 将文件指针的当前位置（以字节为单位）移动或返回到 ByteArray 对象中。下一次调用读取方法时将在此位置开始读取，或者下一次调用写入方法时将在此位置开始写入。
     */
    public get position(): number {
        return this._position;
    }

    public set position(value: number) {
        this._position = value;
        if (value > this.write_position) {
            this.write_position = value;
        }
    }

    /**
     * ByteArray 对象的长度（以字节为单位）。
     * 如果将长度设置为大于当前长度的值，则用零填充字节数组的右侧。
     * 如果将长度设置为小于当前长度的值，将会截断该字节数组
     */
    public get length(): number {
        return this.write_position;
    }

    public set length(value: number) {
        this.write_position = value;
        if (this.data.byteLength > value) {
            this._position = value;
        }

        this._validateBuffer(value);
    }

    protected _validateBuffer(value: number) {
        if (this.data.byteLength < value) {
            let be = this.bufferExtSize;
            let tmp: Uint8Array;
            if (be == 0) {
                tmp = new Uint8Array(value);
            } else {
                let nLen = ((value / be >> 0) + 1) * be;
                tmp = new Uint8Array(nLen);
            }
            tmp.set(this._bytes);
            this._bytes = tmp;
            this.data = new DataView(tmp.buffer);
        }
    }

    /**
     * 可从字节数组的当前位置到数组末尾读取的数据的字节数。
     * 每次访问 ByteArray 对象时，将 bytesAvailable 属性与读取方法结合使用，以确保读取有效的数据
     */
    public get bytesAvailable(): number {
        return this.data.byteLength - this._position;
    }

    /**
     * 清除字节数组的内容，并将 length 和 position 属性重置为 0。
     */
    public clear(): void {
        let buffer = new ArrayBuffer(this.bufferExtSize);
        this.data = new DataView(buffer);
        this._bytes = new Uint8Array(buffer);
        this._position = 0;
        this.write_position = 0;
    }

    /**
     * 从字节流中读取布尔值。读取单个字节，如果字节非零，则返回 true，否则返回 false
     * @return 如果字节不为零，则返回 true，否则返回 false
     */
    public readBoolean(): boolean {
        if (this.validate(1)) return !!this._bytes[this.position++];
    }

    /**
     * 从字节流中读取带符号的字节
     * @return 介于 -128 和 127 之间的整数
     */
    public readByte(): number {
        if (this.validate(1)) return this.data.getInt8(this.position++);
    }


    /**
     * 从字节流中读取 length 参数指定的数据字节数。从 offset 指定的位置开始，将字节读入 bytes 参数指定的 ByteArray 对象中，并将字节写入目标 ByteArray 中
     * @param bytes 要将数据读入的 ByteArray 对象
     * @param offset bytes 中的偏移（位置），应从该位置写入读取的数据
     * @param length 要读取的字节数。默认值 0 导致读取所有可用的数
     */
    public readBytes(bytes: ByteArray, offset: number = 0, length: number = 0): void {
        if (!bytes)
            return;
        
        let pos = this._position;
        let available = this.write_position - pos;
        if (available < 0) {
            error(1025);
            return;
        }
        if (length == 0) {
            length = available;
        } else if (length > available) {
            error(1025);
            return;
        }
        const position = bytes._position;
        bytes._position = 0;
        bytes.validateBuffer(offset + length);
        bytes._position = position;
        bytes._bytes.set(this._bytes.subarray(pos, pos + length), offset);
        this.position += length;
    }

    /**
     * 从字节流中读取一个 IEEE 754 双精度（64 位）浮点数
     * @return 双精度（64 位）浮点
     */
    public readDouble(): number {
        if (this.validate(8)) {
            let value = this.data.getFloat64(this._position, this.$endian == 0);
            this.position += 8;
            return value;
        }
    }

    /**
     * 从字节流中读取一个 IEEE 754 单精度（32 位）浮点数
     * @return 单精度（32 位）浮点
     */
    public readFloat(): number {
        if (this.validate(4)) {
            let value = this.data.getFloat32(this._position, this.$endian == 0);
            this.position += 4;
            return value;
        }
    }

    /**
     * 从字节流中读取一个带符号的 32 位整数
     * @return 介于 -2147483648 和 2147483647 之间的 32 位带符号整
     */
    public readInt(): number {
        if (this.validate(4)) {
            let value = this.data.getInt32(this._position, this.$endian == 0);
            this.position += 4;
            return value;
        }
    }

    /**
     * 从字节流中读取一个带符号的 16 位整数
     * @return 介于 -32768 和 32767 之间的 16 位带符号整
     */
    public readShort(): number {
        if (this.validate(2)) {
            let value = this.data.getInt16(this._position, this.$endian == 0);
            this.position += 2;
            return value;
        }
    }

    /**
     * 从字节流中读取无符号的字节
     * @return 介于 0 和 255 之间的无符号整数
     */
    public readUnsignedByte(): number {
        if (this.validate(1)) return this._bytes[this._position++];
    }

    /**
     * 从字节流中读取一个无符号的 32 位整数
     * @return 介于 0 和 4294967295 之间的 32 位无符号整
     */
    public readUnsignedInt(): number {
        if (this.validate(4)) {
            let value = this.data.getUint32(this._position, this.$endian == 0);
            this.position += 4;
            return value;
        }
    }

    /**
     * 从字节流中读取一个无符号的 16 位整数
     * @return 介于 0 和 65535 之间的 16 位无符号整数
     */
    public readUnsignedShort(): number {
        if (this.validate(2)) {
            let value = this.data.getUint16(this._position, this.$endian == 0);
            this.position += 2;
            return value;
        }
    }

    /**
     * 从字节流中读取一个 UTF-8 字符串。假定字符串的前缀是无符号的短整型（以字节表示长度）
     * @return UTF-8 编码的字符串
     */
    public readUTF(): string {
        let length = this.readUnsignedShort();
        if (length > 0) {

        } else {
            return "";
        }
    }

    /**
     * 从字节流中读取一个由 length 参数指定的 UTF-8 字节序列，并返回一个字符串
     * @param length 指明 UTF-8 字节长度的无符号短整型数
     * @return 由指定长度的 UTF-8 字节组成的字符串
     */
    public readUTFBytes(length: number): string {
        if (!this.validate(length))
            return;
        
        let data = this.data;
        let bytes = new Uint8Array(data.buffer, data.byteOffset + this._position, length);
        this.position += length;
        return this.decodeUTF8(bytes);
    }

    /**
     * 写入布尔值。根据 value 参数写入单个字节。如果为 true，则写入 1，如果为 false，则写入 0
     * @param value 确定写入哪个字节的布尔值。如果该参数为 true，则该方法写入 1；如果该参数为 false，则该方法写入 0
     */
    public writeBoolean(value: boolean): void {
        this.validateBuffer(1);
        this._bytes[this.position++] = +value;
    }

    /**
     * 在字节流中写入一个字节
     * 使用参数的低 8 位。忽略高 24 位
     * @param value 一个 32 位整数。低 8 位将被写入字节流
     */
    public writeByte(value: number): void {
        this.validateBuffer(1);
        this._bytes[this.position++] = value & 0xff;
    }

    /**
     * 将指定字节数组 bytes（起始偏移量为 offset，从零开始的索引）中包含 length 个字节的字节序列写入字节流
     * 如果省略 length 参数，则使用默认长度 0；该方法将从 offset 开始写入整个缓冲区。如果还省略了 offset 参数，则写入整个缓冲区
     * 如果 offset 或 length 超出范围，它们将被锁定到 bytes 数组的开头和结尾
     * @param bytes ByteArray 对象
     * @param offset 从 0 开始的索引，表示在数组中开始写入的位置
     * @param length 一个无符号整数，表示在缓冲区中的写入范围
     */
    public writeBytes(bytes: ByteArray, offset: number = 0, length: number = 0): void {
        let writeLength: number;
        if (offset < 0) {
            return;
        }
        if (length < 0) {
            return;
        } else if (length == 0) {
            writeLength = bytes.length - offset;
        } else {
            writeLength = Math.min(bytes.length - offset, length);
        }

        if (writeLength > 0) {
            this.validateBuffer(writeLength);
            this._bytes.set(bytes._bytes.subarray(offset, offset + writeLength), this._position);
            this._position = this._position + writeLength;
        }
    }

    /**
     * 在字节流中写入一个 IEEE 754 双精度（64 位）浮点数
     * @param value 双精度（64 位）浮点数
     */
    public writeDouble(value: number): void {
        this.validateBuffer(8);
        this.data.setFloat64(this._position, value, this.$endian == 0);
        this.position += 8;
    }

    /**
     * 在字节流中写入一个 IEEE 754 单精度（32 位）浮点数
     * @param value 单精度（32 位）浮点数
     */
    public writeFloat(value: number): void {
        this.validateBuffer(4);
        this.data.setFloat32(this._position, value, this.$endian == 0);
        this.position += 4;
    }

    /**
     * 在字节流中写入一个带符号的 32 位整数
     * @param value 要写入字节流的整数
     */
    public writeInt(value: number): void {
        this.validateBuffer(4);
        this.data.setInt32(this._position, value, this.$endian == 0);
        this.position += 4;
    }

    /**
     * 在字节流中写入一个 16 位整数。使用参数的低 16 位。忽略高 16 位
     * @param value 32 位整数，该整数的低 16 位将被写入字节流
     */
    public writeShort(value: number): void {
        this.validateBuffer(2);
        this.data.setInt16(this._position, value, this.$endian == 0);
        this.position += 2;
    }

    /**
     * 在字节流中写入一个无符号的 32 位整数
     * @param value 要写入字节流的无符号整数
     */
    public writeUnsignedInt(value: number): void {
        this.validateBuffer(4);
        this.data.setUint32(this._position, value, this.$endian == 0);
        this.position += 4;
    }

    /**
     * 在字节流中写入一个无符号的 16 位整数
     * @param value 要写入字节流的无符号整数
     */
    public writeUnsignedShort(value: number): void {
        this.validateBuffer(2);
        this.data.setUint16(this._position, value, this.$endian == 0);
        this.position += 2;
    }

    /**
     * 将 UTF-8 字符串写入字节流。先写入以字节表示的 UTF-8 字符串长度（作为 16 位整数），然后写入表示字符串字符的字节
     * @param value 要写入的字符串值
     */
    public writeUTF(value: string): void {
        let utf8bytes: ArrayLike<number> = this.encodeUTF8(value);
        let length: number = utf8bytes.length;
        this.validateBuffer(2 + length);
        this.data.setUint16(this._position, length, this.$endian == 0);
        this.position += 2;
        this._writeUint8Array(utf8bytes, false);
    }

    /**
     * 将 UTF-8 字符串写入字节流。类似于 writeUTF() 方法，但 writeUTFBytes() 不使用 16 位长度的词为字符串添加前缀
     * @param value 要写入的字符串值
     */
    public writeUTFBytes(value: string): void {
        this._writeUint8Array(this.encodeUTF8(value));
    }

    /**
     * 将 Uint8Array 写入字节流
     * @param bytes 要写入的Uint8Array
     */
    public _writeUint8Array(bytes: Uint8Array | ArrayLike<number>, validateBuffer: boolean = true): void {
        let pos = this._position;
        let npos = pos + bytes.length;
        if (validateBuffer) {
            this.validateBuffer(npos);
        }
        this.bytes.set(bytes, pos);
        this.position = npos;
    }

    public toString(): string {
        return "[ByteArray] length:" + this.length + ", bytesAvailable:" + this.bytesAvailable;
    }

    public validate(len: number): boolean {
        let bl = this._bytes.length;
        if (bl > 0 && this._position + len <= bl) {
            return true;
        } else {
            error(1025);
        }
    }

    protected validateBuffer(len: number): void {
        this.write_position = len > this.write_position ? len : this.write_position;
        len += this._position;
        this._validateBuffer(len);
    }

    private encodeUTF8(str: string): Uint8Array {
        let pos: number = 0;
        let codePoints = this.stringToCodePoints(str);
        let outputBytes = [];

        while (codePoints.length > pos) {
            let code_point: number = codePoints[pos++];

            if (this.inRange(code_point, 0xD800, 0xDFFF)) {
                this.encoderError(code_point);
            }
            else if (this.inRange(code_point, 0x0000, 0x007f)) {
                outputBytes.push(code_point);
            } else {
                let count, offset;
                if (this.inRange(code_point, 0x0080, 0x07FF)) {
                    count = 1;
                    offset = 0xC0;
                } else if (this.inRange(code_point, 0x0800, 0xFFFF)) {
                    count = 2;
                    offset = 0xE0;
                } else if (this.inRange(code_point, 0x10000, 0x10FFFF)) {
                    count = 3;
                    offset = 0xF0;
                }

                outputBytes.push(this.div(code_point, Math.pow(64, count)) + offset);

                while (count > 0) {
                    let temp = this.div(code_point, Math.pow(64, count - 1));
                    outputBytes.push(0x80 + (temp % 64));
                    count -= 1;
                }
            }
        }
        return new Uint8Array(outputBytes);
    }

    private decodeUTF8(data: Uint8Array): string {
        let fatal: boolean = false;
        let pos: number = 0;
        let result: string = "";
        let code_point: number;
        let utf8_code_point = 0;
        let utf8_bytes_needed = 0;
        let utf8_bytes_seen = 0;
        let utf8_lower_boundary = 0;

        while (data.length > pos) {

            let _byte = data[pos++];

            if (_byte == this.EOF_byte) {
                if (utf8_bytes_needed != 0) {
                    code_point = this.decoderError(fatal);
                } else {
                    code_point = this.EOF_code_point;
                }
            } else {

                if (utf8_bytes_needed == 0) {
                    if (this.inRange(_byte, 0x00, 0x7F)) {
                        code_point = _byte;
                    } else {
                        if (this.inRange(_byte, 0xC2, 0xDF)) {
                            utf8_bytes_needed = 1;
                            utf8_lower_boundary = 0x80;
                            utf8_code_point = _byte - 0xC0;
                        } else if (this.inRange(_byte, 0xE0, 0xEF)) {
                            utf8_bytes_needed = 2;
                            utf8_lower_boundary = 0x800;
                            utf8_code_point = _byte - 0xE0;
                        } else if (this.inRange(_byte, 0xF0, 0xF4)) {
                            utf8_bytes_needed = 3;
                            utf8_lower_boundary = 0x10000;
                            utf8_code_point = _byte - 0xF0;
                        } else {
                            this.decoderError(fatal);
                        }
                        utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
                        code_point = null;
                    }
                } else if (!this.inRange(_byte, 0x80, 0xBF)) {
                    utf8_code_point = 0;
                    utf8_bytes_needed = 0;
                    utf8_bytes_seen = 0;
                    utf8_lower_boundary = 0;
                    pos--;
                    code_point = this.decoderError(fatal, _byte);
                } else {

                    utf8_bytes_seen += 1;
                    utf8_code_point = utf8_code_point + (_byte - 0x80) * Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);

                    if (utf8_bytes_seen !== utf8_bytes_needed) {
                        code_point = null;
                    } else {

                        let cp = utf8_code_point;
                        let lower_boundary = utf8_lower_boundary;
                        utf8_code_point = 0;
                        utf8_bytes_needed = 0;
                        utf8_bytes_seen = 0;
                        utf8_lower_boundary = 0;
                        if (this.inRange(cp, lower_boundary, 0x10FFFF) && !this.inRange(cp, 0xD800, 0xDFFF)) {
                            code_point = cp;
                        } else {
                            code_point = this.decoderError(fatal, _byte);
                        }
                    }

                }
            }
            //Decode string
            if (code_point !== null && code_point !== this.EOF_code_point) {
                if (code_point <= 0xFFFF) {
                    if (code_point > 0) result += String.fromCharCode(code_point);
                } else {
                    code_point -= 0x10000;
                    result += String.fromCharCode(0xD800 + ((code_point >> 10) & 0x3ff));
                    result += String.fromCharCode(0xDC00 + (code_point & 0x3ff));
                }
            }
        }
        return result;
    }

    private encoderError(code_point) {
        // error(1026, code_point);
        error(1026);
    }

    private decoderError(fatal, opt_code_point?): number {
        if (fatal) {
            error(1027);
        }
        return opt_code_point || 0xFFFD;
    }

    private EOF_byte: number = -1;

    private EOF_code_point: number = -1;

    private inRange(a, min, max) {
        return min <= a && a <= max;
    }

    private div(n, d) {
        return Math.floor(n / d);
    }

    private stringToCodePoints(string) {
        /** @type {Array.<number>} */
        let cps = [];
        // Based on http://www.w3.org/TR/WebIDL/#idl-DOMString
        let i = 0, n = string.length;
        while (i < string.length) {
            let c = string.charCodeAt(i);
            if (!this.inRange(c, 0xD800, 0xDFFF)) {
                cps.push(c);
            } else if (this.inRange(c, 0xDC00, 0xDFFF)) {
                cps.push(0xFFFD);
            } else { // (inRange(c, 0xD800, 0xDBFF))
                if (i == n - 1) {
                    cps.push(0xFFFD);
                } else {
                    let d = string.charCodeAt(i + 1);
                    if (this.inRange(d, 0xDC00, 0xDFFF)) {
                        let a = c & 0x3FF;
                        let b = d & 0x3FF;
                        i += 1;
                        cps.push(0x10000 + (a << 10) + b);
                    } else {
                        cps.push(0xFFFD);
                    }
                }
            }
            i += 1;
        }
        return cps;
    }
}
