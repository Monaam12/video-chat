import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import mediaHandler from '../MediaHandler'
import Pusher from 'pusher-js'
import Peer from 'simple-peer'

const API_KEY = "93804a6fcd87b99a360c";

export default class App extends Component {
    constructor(){
        super();
        this.state = {
            hasMedia:false,
            otherUserId:null,
        };
        this.user = window.user;
        this.user.stream=null;
        this.peers = {};

        this.mediaHandler = new mediaHandler();
        this.setUpPusher();

        this.callTo = this.callTo.bind(this);
        this.setUpPusher = this.setUpPusher.bind(this);
        this.startPeer = this.startPeer.bind(this);

    }

    componentDidMount(){
        this.mediaHandler.getPermissions()
        .then((stream) => {
            this.setState({hasMedia: true});
            this.user.stream = stream;

            try {
                this.myvideo.srcObject = stream ;
            } catch (error) {
                this.myvideo.src = URL.createObjectURL(stream);
            }

            this.myvideo.play();
        })
    }
    setUpPusher(){
        this.pusher = new Pusher(API_KEY ,{
            authEndpoint:'/pusher/auth',
            cluster:'ap2',
            disableStats:true,
            auth: {
                params:this.user.id,
                headers: {
                    'X-CSRF-Token':window.csrfToken
                }
            }
        });

        this.channel = this.pusher.subscribe('presence-video-channel');
        this.channel.bind(`client-signal-${this.user.id}`, (signal)=> {
            let peer = this.peers[signal.userId];

            if(peer === undefined){
                this.setState({otherUserId:signal.userId});
                peer = this.startPeer(signal.userId,false);
            }

            peer.signal(signal.data);
        });
    }

    startPeer(userId,initiator=true){
        const peer = new Peer({
          initiator,
          stream:this.user.stream,
          trickle: false,
        });
        peer.on('signal',(data) =>{
            this.channel.trigger(`client-signal-${userId}`,{
                type: 'signal',
                userId:this.user.id,
                data:data
            });
        });
        peer.on('stream',(stream)=>{
            try {
                this.userVideo.srcObject = stream ;
            } catch (error) {
                this.userVideo.src = URL.createObjectURL(stream);
            }

            this.userVideo.play();
        });
        peer.on('close',()=>{
            let peer = this.peers[userId];
            if(peer!== undefined){
                peer.destroy();
            }

            this.peers[userId] = undefined
        });

        return peer ;
    }

    callTo(userId) {
        this.peers[userId] = this.startPeer(userId);
    }

    render() {
        return (
            <div className="App">
                {[1,2,3,4].map(userId =>{
                     return this.user.id !== userId ?
                     <button key={userId} onClick={() => this.callTo(userId)}>
                         Call {userId}
                     </button> : null;
                })}
                <div className="video-container">
                    <video className="my-video" ref={(ref)=>{this.myvideo = ref;}}></video>
                    <video className="user-video" ref={(ref)=>{this.userVideo = ref;}}></video>
                </div>
            </div>
        );
    }
}

if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
