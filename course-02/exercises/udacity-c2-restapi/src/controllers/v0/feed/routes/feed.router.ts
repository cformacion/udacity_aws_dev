import { Router, Request, Response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';
import { where } from 'sequelize';


const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
            if(item.url) {
                item.url = AWS.getGetSignedUrl(item.url);
            }
    });
    res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get('/:id', async (req: Request, res: Response) => {
    //get id param
    const idnum = req.params.id;
    //check if id is empty
    if (!idnum) {
        return res.status(400).send('id required');
    }
    //find item by primary key
    const item: FeedItem = await FeedItem.findByPk(idnum);
    //check if item was found
    if (!item) {
        return res.status(404).send('id not found');
    }

    res.send(item);
});

// update a specific resource
router.patch('/:id', async (req: Request, res: Response) => {
        //@TODO try it yourself
        const idnum = req.params.id;
        
        if(!idnum) {
            return res.status(400).send("id required")
        }

        const caption = req.body.caption;
        const fileName = req.body.url;

        //find item by primary key
        let item: FeedItem = await FeedItem.findByPk(idnum);
        //check if item exists
        if(!item) {
            return res.status(404).send("id not found")
        }
        // check if params were passed
        if (!caption && !fileName) {
            return res.status(400).send("nothing to update");
        }
    
        if(caption) {
            FeedItem.update({
                caption: caption
            }, {where: {id: idnum}})
        }

        if(fileName) {
            FeedItem.update({
                url: fileName
            }, {where: {id: idnum}});
        }

        res.status(200).send("update complete");
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName', 
    requireAuth, 
    async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({url: url});
});

// Post meta data and the filename after a file is uploaded 
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/', 
    requireAuth, 
    async (req: Request, res: Response) => {
    const caption = req.body.caption;
    const fileName = req.body.url;

    // check Caption is valid
    if (!caption) {
        return res.status(400).send({ message: 'Caption is required or malformed' });
    }

    // check Filename is valid
    if (!fileName) {
        return res.status(400).send({ message: 'File url is required' });
    }

    const item = await new FeedItem({
            caption: caption,
            url: fileName
    });

    const saved_item = await item.save();

    saved_item.url = AWS.getGetSignedUrl(saved_item.url);
    res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;