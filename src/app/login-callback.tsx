// REDIRECTED PAGE 
import EmptyArt from "@/assets/images/empty.png";
import useTheme from "@/src/hooks/useTheme";
import { supabase } from "@/src/utils/supabase";
import { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    Text,
    View
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { diaryColors } from "../constants/colors";
export default function LoginCallBack(){ 
    const {colors, isDark} = useTheme()
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
            <ConfettiCannon
            count={150}
            origin={{ x: width / 2, y: -20 }}
            fallSpeed={3000}
            fadeOut
            autoStart
            colors={Object.values(diaryColors).map((c) => (isDark ? c.dark : c.light))}
            />
            <Text>{verified? "You've already verified this account!": "Your account has been verified!"}</Text>
            <Image source = {EmptyArt} style = {{width:220, height:220}}/>
        </View> 
    ); 
}