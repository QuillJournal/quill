// REDIRECTED PAGE 
import React, {useState, useEffect} from "react"
import EmptyArt from "@/assets/images/empty.png";
import useTheme from "@/src/hooks/useTheme";
import Confetti from "react-confetti"
import {
    Text, 
    Image, 
    View, 
    Dimensions
} from "react-native"
import { supabase } from "@/src/utils/supabase";
export default function LoginCallBack(){ 
    const {colors} = useTheme()
    const height:number = Dimensions.get("window").height;
    const width:number = Dimensions.get("window").width;
    const [verified, setVerified] = useState(false); 
    useEffect(() => {
        //returns false if there is an error
        async function status(){ 
            try{
                const {data, error} = await supabase.auth.getSession()
                if (error) throw error
                if (data && data.session){
                    if(data.session && data.session.user.email_confirmed_at){
                        setVerified(true)
                    }
                }
            }catch(e){
                console.log(e)
            }
        }
        status()
    }, []);
    return(
        <View> 
            <Confetti
                width = {width} 
                height = {height}
                numberOfPieces = {300}
                gravity = {9.81}
                colors = {["#FF0000","#1b2db1","#1ebc1e","#e1dd08","#ff9100","#d68686","#c015cc","#fb52e4"]}
            />
            <Text>{verified? "You've already verified this account!": "Your account has been verified!"}</Text>
            <Image source = {EmptyArt} style = {{width:220, height:220}}/>
        </View> 
    ); 
}