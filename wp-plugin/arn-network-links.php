<?php
/**
 * Plugin Name: ARN Network Links
 * Description: Cross-links yeninesil.tv, tumcezalar.com and ahmetrifatalbuz.com (sister-site posts box, footer network bar, author link, widget, shortcode).
 * Version: 1.0.0
 * Author: Ahmet Rıfat Albuz
 * License: GPL-2.0-or-later
 *
 * Install: copy this file to wp-content/mu-plugins/ (auto-active) or wp-content/plugins/ and activate.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class ARN_Network_Links
{
    const VERSION = '1.0.0';
    const PERSONAL = 'https://ahmetrifatalbuz.com/';
    const CACHE_TTL = HOUR_IN_SECONDS;

    /** Per-site configuration keyed by host. */
    private static function sites()
    {
        return array(
            'yeninesil.tv' => array(
                'name'   => 'Yeni Nesil TV',
                'url'    => 'https://yeninesil.tv/',
                'source' => 'yeninesil',
                'author' => 'ahmetalbuz',
            ),
            'tumcezalar.com' => array(
                'name'   => 'Tüm Cezalar',
                'url'    => 'https://tumcezalar.com/',
                'source' => 'tumcezalar',
                'author' => 'ahmet',
            ),
        );
    }

    private static function current_host()
    {
        $host = wp_parse_url(home_url(), PHP_URL_HOST);
        return preg_replace('/^www\./', '', strtolower((string) $host));
    }

    private static function current()
    {
        $sites = self::sites();
        $host  = self::current_host();
        return isset($sites[$host]) ? $sites[$host] : null;
    }

    private static function sister()
    {
        $host = self::current_host();
        foreach (self::sites() as $h => $site) {
            if ($h !== $host) {
                return $site;
            }
        }
        return null;
    }

    public static function utm($url, $source)
    {
        return add_query_arg(
            array(
                'utm_source'   => $source,
                'utm_medium'   => 'network',
                'utm_campaign' => 'arn',
            ),
            $url
        );
    }

    public static function init()
    {
        if (!self::current()) {
            return; // Unknown host: stay inert (e.g. staging copies).
        }
        add_filter('the_content', array(__CLASS__, 'append_box'), 20);
        add_action('wp_footer', array(__CLASS__, 'footer_bar'), 5);
        add_action('wp_head', array(__CLASS__, 'styles'));
        add_filter('get_the_author_user_url', array(__CLASS__, 'author_url'), 10, 2);
        add_shortcode('arn_network', array(__CLASS__, 'shortcode'));
        add_action('widgets_init', array(__CLASS__, 'register_widget'));
    }

    /** Latest posts of the sister site via its public REST API, cached. */
    public static function sister_posts($limit = 3)
    {
        $sister = self::sister();
        if (!$sister) {
            return array();
        }
        $key   = 'arn_sister_' . $sister['source'];
        $posts = get_transient($key);
        if (false === $posts) {
            $posts = array();
            $res   = wp_remote_get(
                $sister['url'] . 'wp-json/wp/v2/posts?per_page=6&_fields=link,title,date',
                array('timeout' => 4, 'user-agent' => 'ARN-Network/' . self::VERSION)
            );
            if (!is_wp_error($res) && 200 === (int) wp_remote_retrieve_response_code($res)) {
                $data = json_decode(wp_remote_retrieve_body($res), true);
                if (is_array($data)) {
                    foreach ($data as $p) {
                        if (empty($p['link']) || empty($p['title']['rendered'])) {
                            continue;
                        }
                        $posts[] = array(
                            'link'  => esc_url_raw($p['link']),
                            'title' => wp_strip_all_tags(html_entity_decode($p['title']['rendered'], ENT_QUOTES, 'UTF-8')),
                        );
                    }
                }
            }
            // Cache failures briefly so a down sister site never slows page loads.
            set_transient($key, $posts, $posts ? self::CACHE_TTL : 5 * MINUTE_IN_SECONDS);
        }
        return array_slice($posts, 0, $limit);
    }

    private static function box_html($limit = 3)
    {
        $sister = self::sister();
        $cur    = self::current();
        $posts  = self::sister_posts($limit);
        if (!$sister || !$posts) {
            return '';
        }
        $out  = '<aside class="arn-box" aria-label="' . esc_attr($sister['name']) . '">';
        $out .= '<p class="arn-box__title">' . esc_html($sister['name']) . '</p><ul>';
        foreach ($posts as $p) {
            $out .= '<li><a href="' . esc_url(self::utm($p['link'], $cur['source'])) . '" target="_blank" rel="noopener">' . esc_html($p['title']) . '</a></li>';
        }
        $out .= '</ul><a class="arn-box__more" href="' . esc_url(self::utm($sister['url'], $cur['source'])) . '" target="_blank" rel="noopener">' . esc_html($sister['name']) . ' →</a></aside>';
        return $out;
    }

    public static function append_box($content)
    {
        if (!is_singular('post') || !in_the_loop() || !is_main_query()) {
            return $content;
        }
        return $content . self::box_html(3);
    }

    public static function shortcode($atts)
    {
        $atts = shortcode_atts(array('limit' => 5), $atts, 'arn_network');
        return self::box_html(max(1, min(10, (int) $atts['limit'])));
    }

    public static function footer_bar()
    {
        $cur    = self::current();
        $sister = self::sister();
        $links  = array(
            array('Ahmet Rıfat Albuz', self::PERSONAL),
            array($sister['name'], $sister['url']),
        );
        echo '<nav class="arn-bar" aria-label="Ağımız"><span>Ağımız:</span>';
        foreach ($links as $l) {
            echo ' <a href="' . esc_url(self::utm($l[1], $cur['source'])) . '" target="_blank" rel="noopener">' . esc_html($l[0]) . '</a>';
        }
        echo '</nav>';
    }

    public static function styles()
    {
        echo '<style id="arn-network-css">'
            . '.arn-box{margin:2em 0;padding:1em 1.2em;border:1px solid #e2e2e2;border-left:4px solid #b3122e;border-radius:8px;background:#fafafa}'
            . '.arn-box__title{margin:0 0 .5em;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:.85em;color:#b3122e}'
            . '.arn-box ul{margin:0 0 .6em 1.1em;padding:0}.arn-box li{margin:.3em 0}.arn-box a{text-decoration:none}.arn-box a:hover{text-decoration:underline}'
            . '.arn-box__more{font-weight:600;font-size:.9em}'
            . '.arn-bar{padding:10px 16px;text-align:center;font-size:13px;background:#0f172a;color:#cbd5e1}.arn-bar a{color:#fff;margin:0 .5em;text-decoration:none}.arn-bar a:hover{text-decoration:underline}'
            . '</style>';
    }

    /** Fix empty author website (renders as href="#") for Ahmet's account. */
    public static function author_url($url, $user_id)
    {
        $cur  = self::current();
        $user = get_userdata($user_id);
        if ($user && $cur && $user->user_nicename === $cur['author'] && (empty($url) || '#' === $url)) {
            return self::utm(self::PERSONAL, $cur['source']);
        }
        return $url;
    }

    public static function register_widget()
    {
        register_widget('ARN_Network_Widget');
    }
}

class ARN_Network_Widget extends WP_Widget
{
    public function __construct()
    {
        parent::__construct('arn_network', 'ARN: Kardeş Site Yazıları', array('description' => 'Kardeş sitenin son yazılarını gösterir.'));
    }

    public function widget($args, $instance)
    {
        $limit = isset($instance['limit']) ? (int) $instance['limit'] : 5;
        $html  = ARN_Network_Links::shortcode(array('limit' => $limit));
        if ($html) {
            echo $args['before_widget'] . $html . $args['after_widget']; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts.
        }
    }

    public function form($instance)
    {
        $limit = isset($instance['limit']) ? (int) $instance['limit'] : 5;
        echo '<p><label for="' . esc_attr($this->get_field_id('limit')) . '">Yazı sayısı:</label> ';
        echo '<input id="' . esc_attr($this->get_field_id('limit')) . '" name="' . esc_attr($this->get_field_name('limit')) . '" type="number" min="1" max="10" value="' . esc_attr($limit) . '"></p>';
    }

    public function update($new, $old)
    {
        return array('limit' => max(1, min(10, (int) $new['limit'])));
    }
}

add_action('plugins_loaded', array('ARN_Network_Links', 'init'));
