const winston = require('winston');
const path = require("path")
const logDir = path.resolve("../logs")
const fs=require('fs')
 class Logger {
     constructor(filename) {
         const now = new Date();
         const year = now.getFullYear();
         const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-indexed
         const date = now.getDate().toString().padStart(2, '0');
         const hour = now.getHours().toString().padStart(2, '0');
         const minutes = now.getMinutes().toString().padStart(2, '0');
         const seconds = now.getSeconds().toString().padStart(2, '0');
         const formattedDateTime = `${year}-${month}-${date}--${hour}-${minutes}-${seconds}`;
         const filePath = path.join(logDir, `${formattedDateTime}-${filename}`)
        console.log(filePath)
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [${level}]: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                // new winston.transports.File({ filename: `${filePath}` })
            ]
        });
    }
    getlog () {
        return this.logger
    }
}
module.exports=Logger