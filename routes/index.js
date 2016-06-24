var crypto = require('crypto');
var User = require('../models/user.js');
var Post = require('../models/post.js');


var multer  = require('multer');
//新的使用方法配置multer
var storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, './public/images')
    },
    filename: function (req, file, cb){
        cb(null, file.originalname)
    }
});
var upload = multer({
    storage: storage
});


//如果没有登录，是无法访问发表和退出页面的
function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录!');
        res.redirect('/login');
    }
    next();
}
//如果登录了，是无法访问登录和注册页面的
function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        res.redirect('back');//返回之前的页面
    }
    next();
}
module.exports = function(app){
    app.get('/',function(req,res){
        Post.getAll(null, function (err, posts) {
            if (err) {
                posts = [];
            }
            res.render('index', {
                title: '主页',
                user: req.session.user,
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    })
    app.get('/reg', checkNotLogin);
    app.get('/reg',function(req,res){
        res.render('reg',{
            title:'注册',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    })
    app.post('/reg', checkNotLogin);
    app.post('/reg',function(req,res){
        var name = req.body.name;
        var password = req.body.password;
        var password_re = req.body['password-repeat'];
        //检查两次密码是否一致
        if(password_re != password){
            req.flash('error','两次输入的密码不一致');
            return res.redirect('/reg');//返回注册
        }
        //生成一下密码的md5值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        //将注册信息传入User对象
        var newUser = new User({
            name:name,
            password:password,
            email:req.body.email
        });

        //检查用户名是否已经存在了
        User.get(newUser.name,function(err,user){
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }
            if(user){
                req.flash('error','用户名已经存在');
                return res.redirect('/reg');
            }
            //如果不存在则新增用户
            newUser.save(function(err,user){
                if(err){
                    req.flash('error',err);
                    return res.redirect('/reg');
                }
                //用户的信息存入session
                req.session.user = newUser;
                req.flash('success','注册成功');
                res.redirect('/');
            });
        });
    });
    app.get('/login', checkNotLogin);
    app.get('/login',function(req,res){
        res.render('login',{
            title:'登录',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    })
    app.post('/login', checkNotLogin);
    app.post('/login',function(req,res){
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        //检查用户名是否存在
        User.get(req.body.name,function(err,user){
            if(!user){
                req.flash('error','用户名不存在');
                return res.redirect('/login');
            }
            //检查密码是否一致
            if(user.password != password){
                req.flash('error','密码错误');
                return res.redirect('/login');
            }
            //都匹配之后，将用户的信息存入session
            req.session.user = user;
            req.flash('success','登录成功');
            res.redirect('/');
        })
    })
    app.get('/post', checkLogin);
    app.get('/post',function(req,res){
        res.render('post',{
            title:'发表',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    })
    app.post('/post', checkLogin);
    app.post('/post',function(req,res){
        var currentUser = req.session.user;
        var post = new Post(currentUser.name,req.body.title,req.body.post);
        post.save(function(err){
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.redirect('/');//发表成功跳转到主页
        })
    })
    app.get('/logout', checkLogin);
    app.get('/logout',function(req,res){
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/');//登出成功后跳转到主页

    })
    //上传
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/upload', checkLogin);
    app.post('/upload', upload.array('field1', 5), function (req, res) {
        req.flash('success', '文件上传成功!');
        res.redirect('/upload');
    });
    app.get('/u/:name', function (req, res) {
        //检查用户是否存在
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');//用户不存在则跳转到主页
            }
            //查询并返回该用户的所有文章
            Post.getAll(user.name, function (err, posts) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    user : req.session.user,
                    success : req.flash('success').toString(),
                    error : req.flash('error').toString()
                });
            });
        });
    });
    app.get('/u/:name/:day/:title', function (req, res) {
        Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
}
