
const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const multer = require('multer')
const productsController = require('./Products.controller');
const { authentication } = require('../../Middleware/Middleware.controller')

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const dir = path.join(__dirname, '../../public/varients');
//         if (!fs.existsSync(dir)){
//             fs.mkdirSync(dir, { recursive: true });
//         }
//         cb(null, dir);
//     },
//     filename: (req, file, cb) => {
//         const ext = path.extname(file.originalname);
//         cb(null, `${Date.now()}${ext}`);
//     }
// });
// const upload = multer({ storage });
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir;

        if (file.mimetype === "text/csv") {
            dir = path.join(__dirname, '../outputfiles/blankproducts')
        } else {
            dir = path.join(__dirname, '../../public/varients');
        }

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        if (file.mimetype === "text/csv") {
            cb(null, file.originalname);
        } else {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}${ext}`);
        }
    }
});

const upload = multer({ storage });


//******************************products******************************************** */
router.post('/addproducts', authentication, upload.array('productImages', 10), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.addproducts(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/generateBlankCSVProducts', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.generateBlankCSVProducts(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/upload-products-csv', upload.single('csvfile'), (req, res) => {
    //if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.uploadCSV(req, res)
    //}
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })


});

router.put('/updateproducts/:id', authentication, upload.array('productImages', 10), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.updateproducts(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })


});

router.get('/getproducts', (req, res) => {
    productsController.getproducts(req, res);
});
router.get('/getproductsList', (req, res) => {
    productsController.getproductsList(req, res);
});
router.delete('/deleteproducts/:id', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.deleteproducts(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});
router.get('/exploreproducts', (req, res) => {
    productsController.exploreproducts(req, res);
});
router.get('/mostlovedgadgets', (req, res) => {
    productsController.mostlovedgadgets(req, res);
});
router.get('/productlaunch', (req, res) => {
    productsController.productlaunch(req, res);
});
router.get('/recentlyviewed', (req, res) => {
    productsController.recentlyviewed(req, res);
});
//********************************varients***************************************/
router.post('/addvarientsimages', authentication, upload.array('images'), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.addvarientsimages(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});
router.get('/getvarientsimages', (req, res) => {
    productsController.getvarientsimages(req, res);
});
router.put('/updatevarientsimages/:id', authentication, upload.single('imageName'), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.updatevarientsimages(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.delete('/deletevarientsimages/:id', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.deletevarientsimages(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});


//****************************keys***********************************************/
router.post('/addKeys', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.addKeys(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});
router.delete('/deleteKeys', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.deleteKeys(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});
router.put('/updateKeys', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return productsController.updateKeys(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});
router.get('/getKeys', (req, res) => {
    productsController.getKeys(req, res);
});



module.exports = router;