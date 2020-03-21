var emptyArr = function (size)
{
	return new Array(size).map(()=>0);
}

var opcode = 0; //two bytes

var memory = emptyArr(4096); //one byte each

var register = emptyArr(16); //one byte each

var I = 0; //12 bits
var pc = 0x200; //12 bits 0x200 - 0x1000

//pixels are XORed
var pixels = emptyArr(64 * 32); //1 bit each, if collision detected, set VF register
var screen = document.getElementById("screen").getContext("2d");

var delayTimer = 0; //60hz
var soundTimer = 0; //60hz

var sp = 0; //stack pointer
var stack = emptyArr(16); // holds opcode

var keys = emptyArr(16); //represents key being pressed

var fontset = 
[
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80  // F
];

//will be used to await a key press
var callback = function (){};


var initEventHandlers = function()
{
	window.onkeydown = function(e)
	{
		let key = parseInt(e.key, 16);
		if (!isNaN(key))
		{
			keys[key] = 1;
		}
		callback(e);
	}
	window.onkeyup = function(e)
	{
		let key = parseInt(e.key, 16);
		if (!isNaN(key))
		{
			keys[key] = 0;
		}
	}
}

//clears and returns screen
var initGraphics = function()
{
	screen.fillStyle = "black";
	screen.fillRect(0, 0, 64, 32);
};

var initVariables = function()
{
	pc = 0x200;
	opcode = 0;
	I = 0;
	sp = 0;
};

var loadFontset = function()
{
	for (let i = 0x0; i < 0x050; i ++) //memory location 0 - 80
	{
		memory[i] = fontset[i];
	}
};

var waitFile = function() //waits for file input (chip8 rom)
{
	return new Promise(function (resolve, reject)
	{
		var fileInput = document.getElementById('fileInput');

        fileInput.addEventListener('change', function(e) {
            var file = fileInput.files[0];

            var reader = new FileReader();
            reader.onload = function () {
            	buffer = [...reader.result];
            	resolve();
			  }
            reader.readAsBinaryString(file);
        });
	});
};

var render = function(x, y, address, bytes) //draws bytes bytes to canvas, from address address in memory, at x and y
{
	let flag = false; //VF will be set to this, true if pixel was erased from screen
	for (let i = 0; i < bytes; i ++)
	{
		let byte = "00000000" + memory[address + i].toString(2); //slow, but readable
			byte = byte.substring(byte.length - 8);

		for (let p = 0; p < byte.length; p ++)
		{
			let currentPixel = pixels[x + p + ((y + i) * 64)];
			let newPixel = parseInt(byte[p]);

			screen.fillStyle = ((currentPixel ^ newPixel) == 1) ? "white" : "black";
			screen.fillRect(x + p, y + i, 1, 1);
			pixels[x + p + ((y + i) * 64)] = currentPixel ^ newPixel;
			

			flag |= (newPixel == 1) && (currentPixel == 1)
		} 
	}
	register[0xF] = flag ? 1 : 0;
}

//returns which zero-based index of opcode (refer to wiki to see list of opcodes)
//-1 for invalid opcode
var parseInstruction = function(instruction) //instruction is 2 bytes, or 4 hexadecimal digits
{
	let firstDigit = (instruction & 0xF000) >> 12;
	let secondDigit = (instruction & 0x0F00) >> 8; //usually holding an argument
	let thirdDigit = (instruction & 0x00F0) >> 4;
	let fourthDigit = instruction & 0x000F;

	// console.log(firstDigit);
	// console.log(secondDigit);
	// console.log(thirdDigit);
	// console.log(fourthDigit);

	switch (firstDigit)
	{
		case 0:
		switch(secondDigit)
		{
			case 0:
			return (instruction & 0x00FF) == 0xE0 ? 1 : ((instruction & 0x00FF) == 0xEE ? 2 : 0);
			break;

			default:
			return 0
		}
		break;

		case 1:
		return 3;
		break;

		case 2:
		return 4;
		break;

		case 3:
		return 5;
		break;

		case 4:
		return 6;
		break;

		case 5:
		return fourthDigit == 0 ? 7 : -1;
		break;

		case 6:
		return 8;
		break;

		case 7:
		return 9;
		break;

		case 8:
		switch(fourthDigit)
		{
			case 0:
			return 10
			break;

			case 1:
			return 11
			break;

			case 2:
			return 12
			break;

			case 3:
			return 13
			break;

			case 4:
			return 14
			break;

			case 5:
			return 15
			break;

			case 6:
			return 16
			break;

			case 7:
			return 17
			break;

			case 0xE:
			return 18
			break;

			default:
			return -1;
		}
		break;

		case 9:
		return fourthDigit == 0 ? 19 : -1;
		break;

		case 10: //0xA
		return 20;
		break;

		case 11: //0xB
		return 21;
		break;

		case 12: //0xC
		return 22;
		break;

		case 13: //0xD
		return 23;
		break;

		case 14: //0xE
		return (0x00FF & instruction) == 0x9E ? 24 : ((0x00FF & instruction) == 0xA1 ? 25 : -1);
		break;

		case 15: //0xF
		switch(0x00ff & instruction)
		{
			case 0x07:
			return 26;
			break;

			case 0x0A:
			return 27;
			break;

			case 0x15:
			return 28;
			break;

			case 0x18:
			return 29;
			break;

			case 0x1E:
			return 30;
			break;

			case 0x29:
			return 31;
			break;

			case 0x33:
			return 32;
			break;

			case 0x55:
			return 33;
			break;

			case 0x65:
			return 34;
			break;

			default:
			return -1;
		}
		break;

		default:
		return -1;
	}

	console.log("wtf?");

}

var executeInstruction = async function (instruction, opcode, callback)
{
	console.log(opcode);
	let X = (instruction & 0x0F00) >> 8; //second hex digit
	let Y = (instruction & 0x00F0) >> 4; //third hex digit

	switch(opcode)
	{
		case 0: //0NNN not really needed
		pc += 2;
		break;

		case 1: //00E0 clear screen
		screen.fillStyle = "#000000"
		screen.fillRect(0,0,64,32);
		pc += 2;
		break;
		
		case 2: //00EE return from subroutine
		if (sp == 0)
		{
			window.alert("return when sp is 0!");
		}
		else
		{
			sp --;
			pc = stack[sp];
		}
		break;
		
		case 3: //1NNN jump to address NNN
		pc = 0x0FFF & instruction;
		break;
		
		case 4: //2NNN calls subroutine at NNN
		stack[sp] = pc;
		sp ++;
		pc = 0x0FFF & instruction;
		break;
		
		case 5: //3XNN, skips the next instruction if VX equals NN
		if (register[X] == (instruction & 0x00FF))
		{
			pc += 2;
		}
		pc += 2;
		break;
		
		case 6: //4XNN skips the next instruction if VX does not equal NN
		if (register[X] != (instruction & 0x00FF))
		{
			//alert("yeah");
			pc += 2;
		}
		// console.log(register[X]);
		// console.log(instruction);
		 console.log(register[X] != (instruction & 0x00FF));
		alert("uh huh");
		pc += 2;
		break;
		
		case 7: //5XNN skips the next instruction if VX equals VY
		if (register[X] == register[Y])
		{
			pc += 2;
		}
		pc += 2;
		break;
		
		case 8: //6XNN sets VX to NN
		register[X] = instruction & 0x00FF;
		pc += 2;
		break;
		
		case 9: //7XNN adds NN to VX, extra bits will be truncated (to 1 byte)
		register[X] += instruction & 0x00FF;
		register[X] &= 0x00FF;
		pc += 2;
		break;
		
		case 10: //8XY0 sets VX to the value of VY
		register[X] = register[Y];
		pc += 2;
		break;
		
		case 11: //8XY1 sets VX to VX | VY
		register[X] |= register[Y];
		pc += 2
		break;
		
		case 12: //8XY2 sets VX to VX & VY
		register[X] &= register[Y];
		pc += 2;
		break;
		
		case 13: //8XY3 sets VX to VX ^ VY
		register[X] ^= register[Y];
		pc += 2;
		break;
		
		case 14: //8XY4 adds VY to VX
		register[X] += register[Y];
		if (register[X] > 255)
		{
			register[0xF] = 1;
		}
		else
		{
			register[0xF] = 0;
		}
		register[X] &= 0x00FF;
		break;
		
		case 15: //8XY5 subtracts VY from VX, VF set to 0 when borrow occurs
		register[0xF] = register[X] < register[Y] ? 0 : 1;
		register[X] += (256 - register[Y]);
		register[X] &= 0x00FF;
		pc += 2;
		break;
		
		case 16: //8XY6 stores the least siginificant bit of VX in VF then shifts VX to the right by 1
		register[0xF] = register[X] & 1;
		register[X] >>= 1;
		pc += 2;
		break;
		
		case 17: //8XY7 subtracts VX from VY, VS set to 0 when borrow occurs
		register[0xF] = register[Y] < register[X] ? 0 : 1;
		register[X] = register[Y] + (256 - register[X]);
		register[X] &= 0x00FF;
		pc += 2;
		break;
		
		case 18: //8XYE stores the most significant bit of VX in VF then shifts VX to the left by 1
		register[0xF] = register[X] & 128;
		register[X] <<= 1;
		register[X] &= 0x00FF;
		pc += 2;
		break;
		
		case 19: //9XY0 skips next instruction if VX != VY
		if (register[X] != register[Y])
		{
			pc += 2;
		}
		pc += 2;
		break;
		
		case 20: //ANNN sets I to the address NNN
		I = instruction & 0x0FFF;
		pc += 2;
		break;
		
		case 21: //BNNN jumps to address NNN + V0
		pc = (instruction & 0x0FFF) + register[0];
		break;
		
		case 22: //CXNN Sets VX to the result of a bitwise and operation on a random number (Typically: 0 to 255) and NN
		register[X] = (0x00FF & instruction) & Math.floor(Math.random() * 256);
		pc += 2;
		break;
		
		case 23: //DXYN Draws a sprite at coordinate (VX, VY) that has a width of 8 pixels and a height of N pixels.
		render(register[X], register[Y], I, instruction & 0x000F);
		pc += 2;
		break;
		
		case 24: //EX9E Skips the next instruction if the key stored in VX is pressed
		if (keys[register[X]] == 1)
		{
			pc += 2;
		}
		pc += 2;
		break;
		
		case 25: //EXA1 Skips the next instruction if the key stored in VX isn't pressed
		if (keys[register[X]] == 0)
		{
			pc += 2;
		}
		pc += 2;
		break;
		
		case 26: //FX07 sts VX to the value of the delay timer
		register[X] = delayTimer;
		pc += 2;
		break;
		
		case 27: //FX0A A key press is awaited, and then stored in VX.
		await new Promise(resolve, reject)
		{
			callback = function(e)
			{
				let key = parseInt(e.key, 16);
				if (!isNaN(key))
				{
					register[X] = key;
					callback = function () {};
					resolve();
				}
			}
		}
		pc += 2;
		break;
		
		case 28: //FX15 sets the delay timer to VX
		delayTimer = register[X];
		pc += 2;
		break;
		
		case 29: //FX18 sets the sound timer to VX
		soundTimer = register[X];
		pc += 2;
		break;
		
		case 30: //FX1E adds VX to I, VF set to 1 if VX + I > 0xFFF, else 0
		I += register[X];
		register[0xF] = I > 0xFFF ? 1 : 0;
		I &= 0xFFF;
		pc++;
		break;
		
		case 31: //FX29 Sets I to the location of the sprite for the character in VX
		if ((register[X] >= 0x0) && (register[X] <= 0xF))
		{
			I = 5 * register[X];
		}
		pc += 2;
		break;
		
		case 32: //FX33 Stores the binary-coded decimal representation of VX, with the most significant of three digits at the address in I, the middle digit at I plus 1, and the least significant digit at I plus 2
		let BCD = register[X].toString(10);
		memory[I] = BCD[0];
		memory[I + 1] = BCD[1];
		memory[I + 2] = BCD[2];
		pc += 2;
		break;
		
		case 33: //FX55 Stores V0 to VX (including VX) in memory starting at address I. The offset from I is increased by 1 for each value written, but I itself is left unmodified
		for (let i = 0; i <= 0xF; i++)
		{
			memory[I + i] = register[i];
		}
		pc += 2;
		break;
		
		case 34: //FX65 Fills V0 to VX (including VX) with values from memory starting at address I. The offset from I is increased by 1 for each value written, but I itself is left unmodified
		for (let i = 0; i <= 0xF; i++)
		{
			register[i] = memory[I + i];
		}
		pc += 2;
		break;
	}

	if (typeof(callback) === "function")
	{
		callback();
	}
}

var loadProgram = function()
{
	//start loading at memory address 0x200 == 512
	for (let i = 0; i < buffer.length; i ++)
	{
		memory[0x200 + i] = buffer[i].charCodeAt(0);
	}
	console.log(memory);
}

var startProgram = async function ()
{
	initEventHandlers();
	initGraphics();
	initVariables();
	loadFontset()
	await waitFile();
	loadProgram();

	while((pc >= 0x200) && (pc <= 0x1000) && (pc % 2 == 0)) //valid pc values
	{
		let instruction = (memory[pc] << 8) ^ (memory[pc + 1]);
		let opcode = parseInstruction(instruction);
		// console.log("___________");
		// console.log(instruction)
		// console.log(opcode);
		// console.log(pc)
		// console.log("___________");
		if (opcode == -1)
		{
			alert("syntax error!");
		}
		await new Promise(function(resolve, reject)
		{
			executeInstruction(instruction, opcode, resolve);
		});
		soundTimer = soundTimer == 0 ? 60 : soundTimer - 1;
		delayTimer = delayTimer == 0 ? 60 : delayTimer - 1;
		await new Promise(function(resolve, reject)
		{
			setTimeout(resolve, 50);
		});
	}

}

startProgram();

// console.log(parseOpcode(0x0000));
// console.log(parseOpcode(0x00E0));
// console.log(parseOpcode(0x00EE));
// console.log(parseOpcode(0x1000));
// console.log(parseOpcode(0x2000));
// console.log(parseOpcode(0x3000));
// console.log(parseOpcode(0x4000));
// console.log(parseOpcode(0x5000));
// console.log(parseOpcode(0x6000));
// console.log(parseOpcode(0x7000));
// console.log(parseOpcode(0x8000));
// console.log(parseOpcode(0x8001));
// console.log(parseOpcode(0x8002));
// console.log(parseOpcode(0x8003));
// console.log(parseOpcode(0x8004));
// console.log(parseOpcode(0x8005));
// console.log(parseOpcode(0x8006));
// console.log(parseOpcode(0x8007));
// console.log(parseOpcode(0x800E));
// console.log(parseOpcode(0x9000));
// console.log(parseOpcode(0xA000));
// console.log(parseOpcode(0xB000));
// console.log(parseOpcode(0xC000));
// console.log(parseOpcode(0xD000));
// console.log(parseOpcode(0xE09E));
// console.log(parseOpcode(0xE0A1));
// console.log(parseOpcode(0xF007));
// console.log(parseOpcode(0xF00A));
// console.log(parseOpcode(0xF015));
// console.log(parseOpcode(0xF018));
// console.log(parseOpcode(0xF01E));
// console.log(parseOpcode(0xF029));
// console.log(parseOpcode(0xF033));
// console.log(parseOpcode(0xF055));
// console.log(parseOpcode(0xF065));

// for (let i = 0; i < 1000; i ++)
// {
// 	Math.floor(Math.random() * 0xFFFF)
// }