package com.office.platform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // In-memory message broker prefix for pub/sub topics
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Section 7: ws://<office-host>:8080/ws-attendance
        registry.addEndpoint("/ws-attendance")
                .setAllowedOriginPatterns("*")
                .withSockJS();
                
        // Also support pure WebSocket without SockJS for high performance
        registry.addEndpoint("/ws-attendance")
                .setAllowedOriginPatterns("*");
    }
}

