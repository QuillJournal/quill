import {View, Text, Image, Pressable, StyleSheet, type PressableStateCallbackType} from "react-native";
import React, {useState} from "react";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
export default function Onboarding({position= [100,50]}:{position?:[number, number]}) { // top n left
    const colors = useTheme()
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState(true); 
    const pages = [
        {
            title: "Start a new diary here",
            description: "inpsiring.",
            button: "Next →",
            image: require("../../assets/images/icon.png")
        },
        {
            title: "Make your first entry!",
            description: "inpsiring.",
            button: "Next →",
            image: require("../../assets/images/icon.png")
        },
        {
            title: "done!",
            description: "inpsiring.",
            button: "ok!",
            image: require("../../assets/images/icon.png")
        },
    ]
    function check(){ 
        if(index === 0){
            //check if they clicked the draft button

        }
    }
    function change_page(){ 
        if(index < pages.length -1){
            setIndex(index+1);
        }else{
            setVisible(false);
        }
    }
    const styles = StyleSheet.create({
    scrollContent: {
        width: 300,
        height: 300,
        position: "absolute", 
        left: position[0],
        top: position[1],
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        justifyContent: "center",
        backgroundColor: colors.colors.background, 
        alignItems: "center",
        marginVertical: spacing.xl,
    },
    title: {
        color: colors.colors.text,
        fontSize: fontSizes.xl,
        fontFamily: fonts.heading,
        fontWeight: "700",
        marginBottom: spacing.xs,
    },
    subtitle: {
        color: colors.colors.textMuted,
        fontSize: fontSizes.sm,
        fontFamily: fonts.body,
        lineHeight: 20,
    },
    button: {
        backgroundColor: colors.colors.accent,
        color: colors.colors.text,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm
    }, 
    image:{
        width: 200, 
        height: 200, 
    }
    });
    return(
        visible && 
            <View style = {styles.scrollContent}>
            <Text style = {styles.title}> {pages[index].title} </Text>
            <Text style = {styles.subtitle}> {pages[index].description} </Text>
            <Image style = {styles.image} source = {pages[index].image}/>
            <Pressable 
                style = {({pressed}:PressableStateCallbackType)=> [
                    styles.button,
                    {backgroundColor: pressed? colors.colors.accentPressed:colors.colors.accent},
                    ]}
                disabled = {()=> check()}
                onPress = {change_page}> 
                <Text style = {styles.subtitle}>
                    {pages[index].button} 
                </Text>
            </Pressable>
        </View>
        
    );
}
