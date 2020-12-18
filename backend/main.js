require('dotenv').config()
const morgan = require('morgan')
const express = require('express')
const mysql = require("mysql2/promise")
const multer = require('multer')
const cors = require('cors')
const bodyParser = require('body-parser')
const sha1 = require('sha1');
const MongoClient = require('mongodb').MongoClient
const AWS = require('aws-sdk')
const fs = require('fs')

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const app = express()

app.use(cors());
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(morgan('combined'))

// MYSQL
const pool = mysql.createPool({
    host: process.env.MYSQL_SERVER,
    port: process.env.MYSQL_SVR_PORT,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    connectionLimit: process.env.MYSQL_CON_LIMIT,
    database: process.env.MYSQL_SCHEMA
})

// MONGO
const MONGO_URL = process.env.MONGO_URL
const MONGO_DATABASE = process.env.MONGO_DB
const MONGO_COLLECTION = process.env.MONGO_COL
const mongoClient = new MongoClient(MONGO_URL,{useNewUrlParser:true,useUnifiedTopology:true})

// AWS
const AWS_S3_HOSTNAME = process.env.AWS_S3_HOSTNAME || '' ;
const AWS_S3_ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY || '';
const AWS_S3_SECRET_ACCESSKEY = process.env.AWS_S3_SECRET_ACCESS_KEY || '';
const AWS_S3_BUCKETNAME = process.env.AWS_S3_BUCKETNAME || '';
const spaceEndPoint = new AWS.Endpoint(AWS_S3_HOSTNAME);

const s3 = new AWS.S3({
    endpoint: spaceEndPoint,
    accessKeyId: AWS_S3_ACCESS_KEY,
    secretAccessKey: AWS_S3_SECRET_ACCESSKEY
});


//start the server
//check the database are up before starting the server
const pingSQL = (async () => {
    const conn = await pool.getConnection();
    console.log('Pinging database...')
    await conn.ping();
    conn.release();
    return true
})()

const pingMONGO = (async() => {
    mongoClient.connect()
    return true
})()

//Establish connection , take in params and query the rdbsm
const makeQuery = (sql, pool) => {
    return (async(args) => {
        const conn = await pool.getConnection();
        try{
            let results = await conn.query(sql, args)
            return results[0]
        }
        catch(e){
            console.error('error',e)
        }
        finally{
            conn.release();
        }
    })
}

// SQL Query
const SQL_checkUser = `SELECT password FROM user WHERE user_id = ?`;

const checkUser = makeQuery(SQL_checkUser, pool);


// Login
app.post('/login', (req, resp) => {
	const user_id = req.body['user_id'];
	const password = req.body['password']
	//console.log('user', user_id)
	//console.log('password', password)

	checkUser(user_id)
	.then(results =>{
		console.log('checkuser', results)
		if(results.length > 0)
		{
			if(results[0].password == password)
			{
				resp.status(200).json({log:'login'})
			}
			else{
				resp.status(401).json({log:'wrong password'})
			}
		}
		else{
			resp.status(401).json({log:'Username is incorrect'})
		}
	})
	.catch(e => {
		console.log('failed login', e)
		resp.status(401)
		resp.json({log:'fail'})
	})
})

// Share and upload

const upload = multer({
    dest: process.env.TMP_DIR || 'opt/tmp/uploads'
})

const mkShare = (params, image) => {
    return {
        ts: new Date(),
        title: params.title,
        comments: params.comments,
        image
    }
}

const readFile = (path) => new Promise(
    (resolve, reject) => 
        fs.readFile(path, (err, buff) => {
            if(null != err)
                reject(err)
            else
                resolve(buff)
        })
)

const putObject = (file, buff, s3) => new Promise(
    (resolve, reject) => {
        const params = {
            Bucket: AWS_S3_BUCKETNAME,
            Key: file.filename,
            Body: buff,
            ACL: 'public-read',
            ContentType: file.mimetype,
			ContentLength: file.size
		}
		console.log('params', params)
        s3.putObject(params, (err, result) => {
			if(null != err){
				reject(err)
			}
            else
                resolve(result)
        })
    }
)


// Share
app.post('/share', upload.single('upload'), (req, resp) => {
	//const image = req.file.path
	const user_id = req.body['user_id'];
	const password = req.body['password']
	checkUser(user_id)
	.then(results =>{
		//console.log('getuser', results)
		if(results.length > 0)
		{
			if(results[0].password == password)
			{
				console.log('req.file.path',req.file.path)
				console.log('req.file',req.file)
				readFile(req.file.path)
				.then(buff => {
					putObject(req.file, buff, s3)
					console.log('buff', buff)
				})
				.then(result => {
					console.log('after readfile', req.file)
					const doc = mkShare(req.body, req.file.filename);
					console.log('doc', doc)
					return mongoClient
					.db(MONGO_DB)
					.collection(MONGO_COLLECTION)
					.insertOne(doc)
				})
				.then(results => {
					console.log('insert results: ', results.ops[0]._id)
					
					resp.status(200)
					//resp.end()
					resp.json({id: results.ops[0]._id})
					console.info('>>> response ended')
    			    // delete the temp file
        			fs.unlink(req.file.path, () => {})
					
				})
				.catch(e => {
					console.error('insert error: ', e)
					resp.status(500)
					resp.json({e})
				})
			}
			else{
				resp.status(401).json({log:'wrong password'})
			}
		}
		else{
			resp.status(401).json({log:'no such user'})
		}
	})
	.catch(e => {
		console.error('error', e)
		resp.status(500)
		resp.json({e})
	})
})


app.use(express.static(__dirname + '/static'))

// app.listen(PORT, () => {
// 	console.info(`Application started on port ${PORT} at ${new Date()}`)
// })

Promise.all([pingSQL, pingMONGO])
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Application started at PORT ${PORT}, at ${new Date()}`)
        })
    })
    .catch(e => {
        console.error('error connecting', e)
    })